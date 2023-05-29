package main

import (
	"runtime"

	"github.com/rajveermalviya/go-webgpu/wgpu"
)

func init() {
	runtime.LockOSThread()
}

func main() {
	instance := wgpu.DefaultLimits(nil)
	adapter, err := instance.RequestAdapter(nil)

}
