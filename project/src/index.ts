const input = document.getElementById('input');
const btn = document.getElementById('submit');
const resultBox = document.getElementById('result-box');

async function initWasm() {
    const go = new Go();

    const wasm = await WebAssembly.instantiateStreaming(
        fetch('main.wasm'),
        go.importObject,
    );

    await go.run(wasm.instance);

    const onSubmit = async () => {
        const { value } = input as HTMLInputElement;
    };

    btn.addEventListener('click', onSubmit, { once: true });

    
}
initWasm();
