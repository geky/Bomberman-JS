package main

import (
    "sync"
    "os"
    "fmt"
    "strconv"
    "io"
    "bufio"
    "log"
    "time"
    "net/http"
    "encoding/json"
    "github.com/justinfx/go-socket.io/socketio"
)


type Player struct {
    Name  string             `json:"name"`
    Color int                `json:"color"`
    ID    socketio.SessionID `json:"id"`
    Game  bool               `json:"game"`
}

func (p *Player) String() string {
    if p.Game {return "\033[0;32m"+p.Name+"\033[00m"}
               return "\033[1;33m"+p.Name+"\033[00m"
}

type Gamer struct {
    Color int                `json:"color"`
    ID    socketio.SessionID `json:"id"`
}


type Game struct {
    InGame  bool
    Players map[socketio.SessionID]*Player
    Gamers  map[socketio.SessionID]*Gamer
    Map     []int32
    Width   int
    Height  int
    SIO     *socketio.SocketIO
    Mutex   *sync.Mutex
}

func NewGame(port string) (g *Game) {
    config := socketio.DefaultConfig
    config.Logger = nil
    config.Origins = []string{"www.projectgeky.com:" + port}

    g = &Game {
        false,
        make(map[socketio.SessionID]*Player),
        make(map[socketio.SessionID]*Gamer),
        []int32{},0,0,
        socketio.NewSocketIO(&config),
        new(sync.Mutex),
    }

    g.SIO.OnDisconnect(func(c *socketio.Conn) {
        g.Disconnect(c.SessionID())
    })

    g.SIO.OnMessage(func(c *socketio.Conn, m socketio.Message) {
        //log.Println("!"+m.Data()+"!")
        var msg map[string]interface{}
        if json.Unmarshal(m.Bytes(),&msg) != nil {return}

        for key,data := range msg {
            switch key {
                case "gamer","watcher":
                    v,ok := data.(map[string]interface{}); if !ok {return}
                    name,ok := v["name"].(string)        ; if !ok {return}
                    color,ok := v["color"].(float64)     ; if !ok {return}

                    g.Mutex.Lock()
                    p := &Player{name,int(color),c.SessionID(),key=="gamer"}
                    g.Players[p.ID] = p
                    g.SIO.BroadcastExcept(c,struct{Join *Player}{p})

                    type init struct {
                        ID socketio.SessionID                  `json:"id"`
                        Players map[socketio.SessionID]*Player `json:"players"`
                    }
                    c.Send(struct{Init init}{init{c.SessionID(),g.Players}})
                    g.Mutex.Unlock()

                    log.Println(p.String() + " has joined")

                case "chat":
                    v,ok := data.(string)
                    if !ok || len(v) > 512 {return}

                    type message struct {
                        ID socketio.SessionID `json:"id"`
                        Message string        `json:"msg"`
                    }
                    g.SIO.Broadcast(struct{Chat message}{message{c.SessionID(),v}})


                case "change":
                    v,ok := data.(bool)
                    if (!ok) {return}

                    g.Mutex.Lock()
                    p := g.Players[c.SessionID()]
                    if (p == nil) {g.Mutex.Unlock(); return}

                    p.Game = v
                    g.Mutex.Unlock()

                    type change struct {
                        ID socketio.SessionID `json:"id"`
                        Game bool             `json:"game"`
                    }
                    g.SIO.Broadcast(struct{Change change}{change{c.SessionID(),v}})

                case "disc":
                    g.Disconnect(c.SessionID())
            }
        }
    })
    return
}

func (g *Game) Play() {
    g.Mutex.Lock()
    num := 0
    for _,p := range g.Players {
        g.Gamers[p.ID] = &Gamer{p.Color,p.ID}
        num++
    }

    g.Width = (num*7/4)*2+1
    g.Height = (num*6/4)*2+1

    g.Map = make([]int32,g.Width*g.Height)
    for i:=0; i<g.Width; i++ {
        g.Map[i] = 0x50
        g.Map[i+(g.Height-1)*g.Width] = 0x50
    }
    for i:=0; i<g.Height; i++ {
        g.Map[i*g.Width] = 0x50
        g.Map[i*g.Width + g.Width-1] = 0x50
    }
    for i:=2; i+2<g.Height; i+=2 {
        for j:=2; j+2<g.Width; j+=2 {
            g.Map[i*g.Width+j] = 0x50
        }
    }

    g.Mutex.Unlock()


    g.SIO.Broadcast(struct{Count int}{5})
    time.Sleep(5 * time.Second)
    g.SIO.Broadcast(struct{Start int}{0})
}

func (g *Game) Disconnect(id socketio.SessionID) {
    g.Mutex.Lock()
    defer g.Mutex.Unlock()

    p := g.Players[id]
    if p==nil {return}

    g.SIO.Broadcast(struct{Disc socketio.SessionID}{id})
    delete(g.Players,id)
    log.Println(p.String()+" disconnected")
}

func (g *Game) Console() {
    var command string
    for {
        fmt.Scan(&command)
        switch command {
            case "players":
                g.Mutex.Lock()
                for id,p := range g.Players {
                    fmt.Println(p.String() + ": " + string(id))
                }
                g.Mutex.Unlock()

            case "kick":
                var id socketio.SessionID
                fmt.Scan(&id)
                g.Disconnect(id)

            case "start":
                go g.Play()

            case "end":
                g.SIO.Broadcast(struct{End int}{0})

            default:
                fmt.Println("Bad command: "+command)
        }
    }
}

func (g *Game) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
        default       : w.WriteHeader(http.StatusUnauthorized); return
        case "OPTIONS": w.WriteHeader(http.StatusOK); return
        case "GET"    :
    }

    var file,inner *os.File
    var err error

    switch r.URL.Path {
        case "/bomberman":
            file, err = os.Open("bm.html")
            if err!=nil {w.WriteHeader(http.StatusNotFound); return}
            defer file.Close()

            inner,err = os.Open("bmjoin.html")
            if err!=nil {w.WriteHeader(http.StatusNotFound); return}
            defer inner.Close()

        case "/bmgame":
            file, err = os.Open("bmgame.html")
            if err!=nil {w.WriteHeader(http.StatusNotFound); return}
            defer file.Close()

        default: w.WriteHeader(http.StatusNotFound); return
    }

    w.WriteHeader(http.StatusOK)
    reader := bufio.NewReader(file)
    for {
        buff,err := reader.ReadBytes('@')
        switch num,_ := reader.ReadByte(); num {
            case '1':
                w.Write(buff[:len(buff)-1])
                reader.ReadBytes('@')

                io.Copy(w,inner)
            case '2':
                w.Write(buff[:len(buff)-1])
                reader.ReadBytes('@')

                g.Mutex.Lock()
                buff2,_ := json.Marshal(g.Players)
                g.Mutex.Unlock()
                w.Write(buff2)
            case '3':
                w.Write(buff[:len(buff)-1])
                reader.ReadBytes('@')

                w.Write([]byte(strconv.Itoa(g.Width)))
            case '4':
                w.Write(buff[:len(buff)-1])
                reader.ReadBytes('@')

                w.Write([]byte(strconv.Itoa(g.Height)))
            case '5':
                w.Write(buff[:len(buff)-1])
                reader.ReadBytes('@')

                g.Mutex.Lock()
                buff2,_ := json.Marshal(g.Map)
                g.Mutex.Unlock()
                w.Write(buff2)
            case '6':
                w.Write(buff[:len(buff)-1])
                reader.ReadBytes('@')

                g.Mutex.Lock()
                buff2,_ := json.Marshal(g.Gamers)
                g.Mutex.Unlock()
                w.Write(buff2)
            default:
                w.Write(buff)
        }

        if err != nil {break}
    }
}

func main() {

    var port string
    if len(os.Args) < 2 {
        port = "8080"
    } else {
        port = os.Args[1]
    }

    game := NewGame(port)

    mux := game.SIO.ServeMux()
    mux.Handle("/bomberman", game)
    mux.Handle("/bmgame", game)
    mux.Handle("/", http.FileServer(http.Dir(".")))

    log.Println("starting bm server on port "+port)
    go game.Console()
    err := http.ListenAndServe(":"+port, mux)

    if err != nil {
        log.Fatal("ListenAndServe:", err)
    }
}


