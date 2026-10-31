/**
 * Pequeno servidor de exemplo para o módulo de Entrada de Mercadoria.
 * Serve apenas para testes locais; em produção importe o `entradaRouter` no servidor principal.
 */
import express from 'express';
import bodyParser from 'body-parser';
import entradaRouter from './routes/entradaRouter';

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/entrada', entradaRouter);

const port = process.env.PORT || 4002;
app.listen(port, () => console.log(`Entrada-mercadoria server listening on ${port}`));
