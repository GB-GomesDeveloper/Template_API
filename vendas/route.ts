import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

BigInt.prototype.toJSON = function () {
    const int = Number.parseInt(this.toString());
    return int ?? this.toString();
};

export const GET = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    try {
        if (id) {
            const idsArray = id.split(',').map(id => BigInt(id.trim()));

            const getlistUnidade = await prisma.vendas.findMany({
                where: {
                    id_produto: {
                        in: idsArray,
                    },
                },
                select: {
                    id: true, // Seleciona apenas o campo 'id'
                    unidade: true, // Seleciona apenas o campo 'unidade'
                    id_produto: true, // Seleciona apenas o campo 'unidade'
                },
            });

            if(getlistUnidade){
                return NextResponse.json(getlistUnidade, { status: 200 })
            }else{
                return NextResponse.json("Nenhuma venda encontrado pelo Id", { status: 404 })
            }
        } else {
            const getListVendas = await prisma.vendas.findMany();
            if (getListVendas.length > 0) {
                return NextResponse.json(getListVendas, { status: 200 })
            } else {
                return NextResponse.json("Nenhuma venda encontrada", { status: 404 })
            }

        }
    } catch (error) {
        return NextResponse.json("Erro ao buscar vendas:" + error, { status: 500 })
    }
}

export const DELETE = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    try {
        if (!id) return NextResponse.json("Parametro id não encontrado", { status: 404 });

        const idsArray = id.split(',').map(id => Number(id.trim()));
        const IdWhere = await prisma.vendas.deleteMany(
            {
                where: {
                    id: { in: idsArray }
                }
            }
        )
        if (IdWhere) {
            return NextResponse.json({ status: 200 });
        } else {
            return NextResponse.json("Venda não encontrada", { status: 404 });
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

export const POST = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const idProduto = searchParams.get("IdProduto") || "";
    try {
        const data = await req.formData()
        const formData = Object.fromEntries(data.entries());
        const dataAtual = new Date()

        if (!formData || Object.keys(formData).length === 0) return NextResponse.json("Erro ao receber dados", { status: 404 });

        const productData = {
            id_produto: BigInt(idProduto),
            data: new Date(dataAtual),
            unidade: Number(formData.estoque)
        };

        if (idProduto) {
            const pushDb = await prisma.vendas.create({ data: productData });
            if (pushDb) {
                return NextResponse.json({ status: 200 });
            } else {
                return NextResponse.json("erro ao enviar dados", { status: 503 });
            }
        } else {
            return NextResponse.json("Parametro codeBarra não encontrado", { status: 403 });
        }

    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json("Erro ao deletar produto: " + error, { status: 500 });
        }
    }

}
