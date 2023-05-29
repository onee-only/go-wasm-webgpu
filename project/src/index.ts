const input = document.getElementById('input');
const btn = document.getElementById('submit');
const resultBox = document.getElementById('result-box');

async function initWasm() {
    const go = new Go();

    const wasm = await WebAssembly.instantiateStreaming(
        fetch('main.wasm'),
        go.importObject,
    );

    go.run(wasm.instance);

    btn.addEventListener('click', onSubmit, { once: true });
}

async function onSubmit() {
    const value = (input as HTMLInputElement).value;
    
}

initWasm();
