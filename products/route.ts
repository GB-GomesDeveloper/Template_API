import { NextResponse } from "next/server"
import prisma from "../../../../lib/prisma";
import path from "path";
import { promises as fs } from "fs";

BigInt.prototype.toJSON = function () {
    const int = Number.parseInt(this.toString());
    return int ?? this.toString();
};

export const GET = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id_product");
    const search = searchParams.get("search");
    const codeBarra = searchParams.get("codeBarra");

    try {
        if (productId) {
            // Converter os IDs em um array
            const idsArray = productId.split(',').map(id => BigInt(id.trim()));

            const products = await prisma.products.findMany({
                where: {
                    id: {
                        in: idsArray,
                    },
                },
            });

            if (products.length !== 0) {
                return NextResponse.json(products, { status: 200 })
            } else {
                return NextResponse.json("Nenhum produto encontrado pelo Id", { status: 404 })
            }
        } else if (search) {
            const searchLower = search.toLowerCase();

            const getsearch = await prisma.products.findMany({
                where: {
                    OR: [
                        {
                            nome: {
                                contains: searchLower,
                            },
                        },
                        {
                            // Verifica as iniciais do nome do produto
                            nome: {
                                startsWith: searchLower,
                            },
                        },
                    ],
                },
            });
            if (getsearch) {
                return NextResponse.json(getsearch, { status: 200 })
            } else {
                return NextResponse.json("Nenhum produto encontrado pelo nome", { status: 404 })
            }
        } else if (codeBarra) {
            const getCodeBarra = await prisma.products.findMany({
                where: {
                    codeBarra: codeBarra,
                },

            });
            if (getCodeBarra) {
                return NextResponse.json(getCodeBarra, { status: 200 })
            } else {
                return NextResponse.json("Nenhum produto encontrado pelo código de barras", { status: 404 })
            }
        }
    } catch (error) {
        return NextResponse.json("Erro ao buscar produtos pelo Id: " + error, { status: 500 })
    }
    try {
        const products = await prisma.products.findMany();
        if (products.length > 0) {
            return NextResponse.json(products, { status: 200 })
        } else {
            return NextResponse.json("Nenhum produto encontrado", { status: 404 })
        }
    } catch (error) {
        return NextResponse.json("Erro ao buscar produtos", { status: 500 })
    }
}

export const POST = async (req: Request) => {
    try {
        const data = await req.formData()
        const formData = Object.fromEntries(data.entries());
        const dataAtual = new Date()

        if (!formData || Object.keys(formData).length === 0) return NextResponse.json("Erro ao receber dados", { status: 404 });

        const productData = {
            nome: formData.nome as string,
            valor: formData.money as string,
            codeBarra: formData.codeBarra as string,
            estoque: Number(formData.estoque),
            data: new Date(dataAtual),
            image: formData.fileUpload as string,
        };

        const pushDb = await prisma.products.create({ data: productData })
        if (pushDb) {

            const fileUpload = data.get('fileUpload');

            // Verifica se o arquivo foi enviado
            if (!(fileUpload instanceof File)) {
                return NextResponse.json("Nenhum arquivo enviado ou tipo inválido.", { status: 404 });
            }

            const dirUpload = path.join(process.cwd(), `/public/res/products/${pushDb.id}`);
            await fs.mkdir(dirUpload, { recursive: true });

            // Lê o arquivo como ArrayBuffer
            const arrayBuffer = await fileUpload.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const filePath = path.join(dirUpload, fileUpload.name);

            // Armazena o arquivo na pasta especificada
            await fs.writeFile(filePath, buffer);

            return NextResponse.json({ status: 200 });
        } else {
            return NextResponse.json("erro ao enviar dados", { status: 503 });
        }


    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("Unique constraint")) {
                return NextResponse.json("Erro ao enviar dados: " + error, { status: 403 })
            } else {
                return NextResponse.json("Erro ao enviar dados: " + error, { status: 500 })
            }
        }
    }
}

export const DELETE = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    try {
        if (!id) return NextResponse.json("Parametro id não encontrado", { status: 404 });

        const IdWhere = await prisma.products.delete(
            {
                where: {
                    id: BigInt(id)
                }
            }
        )
        const DirFile = path.join(process.cwd(), `/public/res/products/${id}`);
        if (IdWhere && DirFile) {
            await fs.access(DirFile)
            await fs.rm(DirFile, { recursive: true, force: true })
            return NextResponse.json({ status: 200 });
        } else {
            return NextResponse.json("Produto não encontrado", { status: 404 });
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("Foreign key")) {
                return NextResponse.json("Foreign key constraint failed", { status: 403 });
            } else {
                return NextResponse.json("Erro ao deletar produto: " + error, { status: 500 });
            }
        }
    }
}

export const PUT = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const id_produto_estoque = searchParams.get("id_produto_estoque");
    try {

        if (id) {
            const data = await req.formData()
            const formData = Object.fromEntries(data.entries());
            const dataAtual = new Date()

            if (!formData || Object.keys(formData).length === 0) return NextResponse.json("Erro ao receber dados", { status: 404 });

            const productData = {
                nome: formData.nome as string,
                valor: formData.money as string,
                codeBarra: formData.codeBarra as string,
                estoque: Number(formData.estoque),
                data: new Date(dataAtual),
                image: formData.fileUpload as string,
            };

            const pushDb = await prisma.products.update({ where: { id: BigInt(id) }, data: productData })
            if (pushDb) {

                const fileUpload = data.get('fileUpload');

                // Verifica se o arquivo foi enviado
                if (!(fileUpload instanceof File) || !fileUpload) {
                    return NextResponse.json("Nenhum arquivo enviado ou tipo inválido.");
                }

                if (fileUpload.name !== productData.image) {
                    return NextResponse.json({ status: 200 });
                }

                const dirUpload = path.join(process.cwd(), `/public/res/products/${pushDb.id}`);

                try {
                    await fs.access(dirUpload)
                    await fs.rm(dirUpload, { recursive: true, force: true })

                    await fs.mkdir(dirUpload, { recursive: true });

                    const arrayBuffer = await fileUpload.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const filePath = path.join(dirUpload, fileUpload.name);
                    await fs.writeFile(filePath, buffer);
                } catch {
                    await fs.mkdir(dirUpload, { recursive: true });

                    const arrayBuffer = await fileUpload.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const filePath = path.join(dirUpload, fileUpload.name);

                    await fs.writeFile(filePath, buffer);
                }

                return NextResponse.json({ status: 200 });
            } else {
                return NextResponse.json("Erro ao editar os dados.", { status: 503 });
            }

        } else if (id_produto_estoque) {
            const data = await req.json();

            const productData = {
                estoque: Number(data.estoque),
            };

            const EditEstoque = await prisma.products.update({ where: { id: BigInt(id_produto_estoque) }, data: productData })
            if (EditEstoque) {
                return NextResponse.json({ status: 200 });
            } else {
                return NextResponse.json("Erro ao editar estoque", { status: 503 });
            }

        }
    } catch (error) {
        return NextResponse.json("Erro ao enviar dados: " + error, { status: 500 })
    }
}




// Converte o FormData em um objeto JSON
// formData.forEach((value, key) => {
//     data[key] = value;
// });
