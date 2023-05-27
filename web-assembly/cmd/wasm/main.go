package main

import (
	"fmt"
	"syscall/js"
)

var htmlString = `<h4>Hello, I'm an HTML snippet form Go!</h4>`

func GetHTML() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		return htmlString
	})
}

func main() {

	c := make(chan struct{})

	fmt.Println("Hello Web Assembly from Go!")
	js.Global().Set("getHTML", GetHTML())

	<-c
}
