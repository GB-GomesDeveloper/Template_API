import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { isNumber } from "chart.js/helpers";

export async function GET (request: Request) {
// Implementa funcionalidade Celular

        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");
        const idLocal = Number(searchParams.get("id"));

        try {
          if(email){
            const users = await prisma.users.findMany({where: {email: email}});
            if (users.length > 0) {
              return NextResponse.json({response: users},{ status: 200});
            } else {
              return  NextResponse.json({ status: 404}); // Retorna um array vazio se nenhum email for desejavel for encontrado 
            }
          }else if(idLocal){
            const users = await prisma.users.findMany({where: {id: idLocal}});
            if (users.length > 0) {
              return NextResponse.json({response: users},{ status: 200});
            } else {
              return  NextResponse.json("Usuário não encontrado",{ status: 404}); // Retorna um array vazio se nenhum email for desejavel for encontrado 
            }
          }else{
            return  NextResponse.json({ message: "Parametro não encontrado." }, {status: 404});
          }
        } catch (error) {
            console.error(error);
           return  NextResponse.json({ message: "Erro ao buscar usuários.", erro: error }, {status: 404});
        }
}