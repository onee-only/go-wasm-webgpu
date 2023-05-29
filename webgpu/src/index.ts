import { decode, encode, BufferLike, RawImageData } from "jpeg-js";
import * as buffer from "buffer";
import { resolve } from "path";
(window as any).Buffer = buffer.Buffer;

document.getElementById("fileinput").onchange = imageSelected;

function imageSelected(event: Event) {
    const files = this.files;

    if (!files || files.length < 1) {
        return;
    }

    if (files[0].type != "image/jpeg") {
        console.log("file is not a jpeg");
        return;
    }

    const dataUrlReader = new FileReader();
    dataUrlReader.addEventListener("load", () => {
        (document.getElementById("inputimage") as HTMLImageElement).src =
            dataUrlReader.result as string;
    });
    dataUrlReader.readAsDataURL(files[0]);

    const arrayReader = new FileReader();
    arrayReader.addEventListener("load", async () => {
        const d = decode(arrayReader.result as ArrayBuffer);
        const output_div = document.getElementById("outputimages");

        const result = await processImage(new Uint8Array(d.data), d.width, d.height);
        // ENCODE TO JPEG DATA
        const resultImage: RawImageData<BufferLike> = {
            width: d.width,
            height: d.height,
            data: result,
        };
        const encoded = encode(resultImage, 100);

        // AS DATA URL
        let binary = "";
        var bytes = new Uint8Array(encoded.data);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        let processed = "data:" + files[0].type + ";base64,";
        processed += window.btoa(binary);
        const img = new Image(d.width, d.height);
        img.src = processed;
        output_div.appendChild(img);
    });

    arrayReader.readAsArrayBuffer(files[0]);
}

async function processImage(
    array: Uint8Array,
    width: number,
    height: number
): Promise<Uint8Array> {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    return new Promise((resolve) => {
        const sizeArray = new Int32Array([width, height]);
        const gpuWidthHeightBuffer = device.createBuffer({
            mappedAtCreation: true,
            size: sizeArray.byteLength,
            usage: GPUBufferUsage.STORAGE,
        });
        new Int32Array(gpuWidthHeightBuffer.getMappedRange()).set(sizeArray);
        gpuWidthHeightBuffer.unmap();

        const gpuInputBuffer = device.createBuffer({
            mappedAtCreation: true,
            size: array.byteLength,
            usage: GPUBufferUsage.STORAGE,
        });
        new Uint8Array(gpuInputBuffer.getMappedRange()).set(array);
        gpuInputBuffer.unmap();

        const gpuResultBuffer = device.createBuffer({
            size: array.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });

        const gpuReadBuffer = device.createBuffer({
            size: array.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
            ] as GPUBindGroupLayoutEntry[],
        });

        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: gpuWidthHeightBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: gpuInputBuffer,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: gpuResultBuffer,
                    },
                },
            ],
        });

        const shaderModule = device.createShaderModule({
            code: `
                struct Size {
                    size: vec2<u32>
                };

                struct Image {
                    rgba: array<u32>
                };

                @group(0) @binding(0) var<storage,read> widthHeight: Size;
                @group(0) @binding(1) var<storage,read_write> inputPixels: Image;
                @group(0) @binding(2) var<storage,read_write> outputPixels: Image;

                @compute
                @workgroup_size(16, 16)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let index : u32 = global_id.x + global_id.y * widthHeight.size.x;
                    outputPixels.rgba[index] = 4294667295u - inputPixels.rgba[index];
                }
            `,
        });

        const computePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            compute: {
                module: shaderModule,
                entryPoint: "main",
            },
        });

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(width, height);
        passEncoder.end();

        commandEncoder.copyBufferToBuffer(
            gpuResultBuffer,
            0,
            gpuReadBuffer,
            0,
            array.byteLength
        );

        device.queue.submit([commandEncoder.finish()]);

        gpuReadBuffer.mapAsync(GPUMapMode.READ).then(() => {
            resolve(new Uint8Array(gpuReadBuffer.getMappedRange()));
        });

        resolve(array);
    });
}
