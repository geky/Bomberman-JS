package main

import (
    "os"
    "io"
    "bufio"
    "log"
    "net/http"
    "sync"
    "github.com/justinfx/go-socket.io/socketio"
)

type Game struct {
    InGame bool
    Gamers map[socketio.SessionID]bool
}

func (g *Game) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
        default       : w.WriteHeader(http.StatusUnauthorized); return
        case "OPTIONS": w.WriteHeader(http.StatusOK); return
        case "GET"    :
    }

    var (
        file1, file2 *os.File
        err1, err2 error
    )

    file1, err1 = os.Open("bm.html")
    if g.InGame {
        file2, err2 = os.Open("bmwatch.html")
    } else {
        file2, err2 = os.Open("bmwait.html")
    }

    if err1!=nil || err2!=nil {
        w.WriteHeader(http.StatusNotFound)
        return
    } else {
        w.WriteHeader(http.StatusOK)
        defer file1.Close()
        defer file2.Close()
    }

    reader := bufio.NewReader(file1)
    buff,_ := reader.ReadBytes('@')
    w.Write(buff[:len(buff)-2])
    reader.ReadBytes('@')

    io.Copy(w,file2)

    buff,_ = reader.ReadBytes('@')
    w.Write(buff)
}

type Announcement struct {
    Announcement string
}

type Buffer struct {
    Buffer []interface{}
}

type Message struct {
    Message []string
}

// A very simple chat server
func main() {
    game := new(Game)

    var port string
    if len(os.Args) < 2 {
        port = "8080"
    } else {
        port = os.Args[1]
    }

    var buffer []interface{}
    mutex := new(sync.Mutex)

    // create the socket.io server and mux it to /socket.io/
    config := socketio.DefaultConfig
    config.Origins = []string{"localhost:"+port}
    sio := socketio.NewSocketIO(&config)

    // when a client connects - send it the buffer and broadcasta an announcement
    sio.OnConnect(func(c *socketio.Conn) {
        mutex.Lock()
        b := make([]interface{}, len(buffer))
        copy(b, buffer)
        c.Send(Buffer{b})
        mutex.Unlock()
        log.Println("connection -> " + c.String())
        sio.Broadcast(Announcement{"connected: " + c.String()})
    })

    // when a client disconnects - send an announcement
    sio.OnDisconnect(func(c *socketio.Conn) {
        log.Println("disconnected -> " + c.String())
        sio.Broadcast(Announcement{"disconnected: " + c.String()})
    })

    // when a client send a message - broadcast and store it
    sio.OnMessage(func(c *socketio.Conn, msg socketio.Message) {
        payload := Message{[]string{c.String(), msg.Data()}}
        mutex.Lock()
        buffer = append(buffer, payload)
        mutex.Unlock()
        sio.Broadcast(payload)
    })

    log.Println("starting bm server on port "+port)

    mux := sio.ServeMux()
    mux.Handle("/bomberman", game)
    mux.Handle("/", http.FileServer(http.Dir(".")))

    err := http.ListenAndServe(":"+port, mux)

    if err != nil {
        log.Fatal("ListenAndServe:", err)
    }
}
