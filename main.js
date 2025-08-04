const tabela = document.querySelector('#tabela tbody');
const filtro = document.getElementById('filtro');
const btnAdicionar = document.getElementById('btnAdicionar');
const form = document.getElementById('formulario');
const btnLogin = document.getElementById('btnLogin');

const PLANILHA_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4';
const ABA = 'Página1';
const CLIENT_ID = '789808431754-iabrrvpv2hbej6eeffflfgdh12ic0kd4.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let dadosPlanilha = [];
let modoEdicao = false;
let indiceEdicao = null;
let nomesColunas = [];

window.onload = () => {
    gapi.load('client', async () => {
        await gapi.client.init({
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        });
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async tokenResponse => {
                if (tokenResponse.error) {
                    console.error(tokenResponse);
                    return;
                }
                console.log('Autenticado com sucesso!');
                await carregarDados();
            }
        });
    });
};

btnLogin.addEventListener('click', () => {
    tokenClient.requestAccessToken({ prompt: 'consent' });
});

async function carregarDados() {
    const res = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: PLANILHA_ID,
        range: ABA
    });

    const valores = res.result.values || [];
    nomesColunas = valores[0] || [];
    const linhas = valores.slice(1);

    dadosPlanilha = linhas.map(linha => {
        const item = {};
        nomesColunas.forEach((col, i) => {
            item[col] = linha[i] || '';
        });
        return item;
    });

    exibirTabela(filtrar(dadosPlanilha));
}

function exibirTabela(dados) {
    tabela.innerHTML = '';

    dados.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item['Codigo rms'] || ''}</td>
            <td>${item['Solicitado por:'] || ''}</td>
            <td>${item['Objeto da Compra'] || ''}</td>
            <td>${item['Valor'] || ''}</td>
            <td>${item['Data1'] || ''}</td>
            <td>
                <button onclick="verDetalhes(${i})">Ver</button>
                <button onclick="editarItem(${i})">Editar</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

window.verDetalhes = function(index) {
    const item = filtrar(dadosPlanilha)[index];
    const container = document.getElementById('detalhesContainer');
    container.innerHTML = '';
    for (const chave in item) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${chave}:</strong> ${item[chave]}`;
        container.appendChild(p);
    }
    document.getElementById('modalDetalhes').classList.add('mostrar');
};

window.editarItem = function(index) {
    const item = filtrar(dadosPlanilha)[index];
    const campos = form.querySelectorAll('input');
    campos.forEach(input => {
        input.value = item[input.name] || '';
    });
    modoEdicao = true;
    indiceEdicao = index;
    document.getElementById('modalFormulario').classList.add('mostrar');
};

form.addEventListener('submit', async e => {
    e.preventDefault();

    const dados = {};
    const campos = form.querySelectorAll('input');
    campos.forEach(input => {
        dados[input.name] = input.value;
    });

    const valores = [Object.values(dados)];

    try {
        if (modoEdicao) {
            const linha = indiceEdicao + 2;
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: PLANILHA_ID,
                range: `${ABA}!A${linha}`,
                valueInputOption: 'RAW',
                resource: { values }
            });
            console.log('Linha atualizada');
        } else {
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: PLANILHA_ID,
                range: `${ABA}!A1`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values }
            });
            console.log('Linha adicionada');
        }

        await carregarDados();
        form.reset();
        modoEdicao = false;
        document.getElementById('modalFormulario').classList.remove('mostrar');
    } catch (err) {
        console.error('Erro ao gravar na planilha:', err);
    }
});

filtro.addEventListener('input', () => {
    exibirTabela(filtrar(dadosPlanilha));
});

btnAdicionar.addEventListener('click', () => {
    form.reset();
    modoEdicao = false;
    indiceEdicao = null;
    document.getElementById('modalFormulario').classList.add('mostrar');
});

document.querySelectorAll('.fechar').forEach(botao => {
    botao.addEventListener('click', () => {
        const id = botao.dataset.close;
        document.getElementById(id).classList.remove('mostrar');
    });
});

function filtrar(lista) {
    const termo = filtro.value.toLowerCase();
    return lista.filter(item => {
        return Object.values(item).some(valor => valor.toLowerCase().includes(termo));
    });
}