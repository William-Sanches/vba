const tabela = document.querySelector('#tabela tbody');
const filtro = document.getElementById('filtro');
const btnAdicionar = document.getElementById('btnAdicionar');
const modalDetalhes = document.getElementById('modalDetalhes');
const modalFormulario = document.getElementById('modalFormulario');
const form = document.getElementById('formulario');
const btnLogin = document.getElementById('btnLogin');

let dadosPlanilha = [];
let modoEdicao = false;
let indiceEdicao = null;

const PLANILHA_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4';
const ABA = 'Página1';

async function carregarDados() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${PLANILHA_ID}/values/${ABA}?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const json = await res.json();

    const nomesColunas = json.values[0];
    const linhas = json.values.slice(1);

    dadosPlanilha = linhas.map(linha => {
      const item = {};
      nomesColunas.forEach((coluna, i) => {
        item[coluna] = linha[i] || '';
      });
      return item;
    });

    exibirTabela(filtrar(dadosPlanilha));
  } catch (erro) {
    console.error('Erro ao carregar dados:', erro);
  }
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
        <button onclick="deletarLinha(${i})">Deletar</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

function verDetalhes(index) {
  const item = filtrar(dadosPlanilha)[index];
  const container = document.getElementById('detalhesContainer');
  container.innerHTML = '';

  for (const chave in item) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${chave}:</strong> ${item[chave]}`;
    container.appendChild(p);
  }

  mostrarModal('modalDetalhes');
}

function editarItem(index) {
  const item = filtrar(dadosPlanilha)[index];
  const campos = form.querySelectorAll('input');

  campos.forEach(input => {
    input.value = item[input.name] || '';
  });

  modoEdicao = true;
  indiceEdicao = index;
  mostrarModal('modalFormulario');
}

form.addEventListener('submit', async e => {
  e.preventDefault();

  const dados = {};
  const campos = form.querySelectorAll('input');

  campos.forEach(input => {
    dados[input.name] = input.value;
  });

  if (modoEdicao) {
    await editarLinha(indiceEdicao, dados);
  } else {
    await adicionarLinha(dados);
  }

  form.reset();
  esconderModal('modalFormulario');
  modoEdicao = false;
  await carregarDados();
});

filtro.addEventListener('input', () => {
  exibirTabela(filtrar(dadosPlanilha));
});

btnAdicionar.addEventListener('click', () => {
  form.reset();
  modoEdicao = false;
  mostrarModal('modalFormulario');
});

document.querySelectorAll('.fechar').forEach(botao => {
  botao.addEventListener('click', () => {
    const id = botao.dataset.close;
    esconderModal(id);
  });
});

btnLogin.addEventListener('click', () => {
  autenticarGoogle();
});

function mostrarModal(id) {
  document.getElementById(id).classList.add('mostrar');
}

function esconderModal(id) {
  document.getElementById(id).classList.remove('mostrar');
}

// Função para autenticação com Google
async function autenticarGoogle() {
  await gapi.load('client:auth2', async () => {
    await gapi.client.init({
      clientId: '789808431754-iabrrvpv2hbej6eeffflfgdh12ic0kd4.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
    });

    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      await gapi.auth2.getAuthInstance().signIn();
    }

    gapi.client.setApiKey(API_KEY);
    carregarDados();
  });
}

const API_KEY = 'AIzaSyAMEOQ4ElM803iRicZ0JggvANlZrOYHNT4';

// Função para adicionar uma nova linha
async function adicionarLinha(dados) {
  const valores = Object.values(dados);

  const request = {
    spreadsheetId: PLANILHA_ID,
    range: ABA,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [valores]
    }
  };

  try {
    await gapi.client.sheets.spreadsheets.values.append(request);
  } catch (error) {
    console.error('Erro ao adicionar linha:', error);
  }
}

// Função para editar uma linha existente
async function editarLinha(indiceDados, dados) {
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: PLANILHA_ID,
    range: ABA
  });

  const nomesColunas = response.result.values[0];
  const linhaParaEditar = indiceDados + 1;

  const valores = nomesColunas.map(coluna => dados[coluna] || '');

  try {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: PLANILHA_ID,
      range: `${ABA}!A${linhaParaEditar}`,
      valueInputOption: 'RAW',
      resource: {
        values: [valores]
      }
    });
  } catch (error) {
    console.error('Erro ao editar linha:', error);
  }
}

// Função para deletar uma linha
async function deletarLinha(indiceDados) {
  const indiceLinha = indiceDados + 1;

  const batchUpdateRequest = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: await obterSheetId(),
            dimension: "ROWS",
            startIndex: indiceLinha,
            endIndex: indiceLinha + 1
          }
        }
      }
    ]
  };

  try {
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: PLANILHA_ID,
      resource: batchUpdateRequest
    });
    await carregarDados();
  } catch (error) {
    console.error('Erro ao deletar linha:', error);
  }
}

// Função para obter o sheetId da aba
async function obterSheetId() {
  const response = await gapi.client.sheets.spreadsheets.get({
    spreadsheetId: PLANILHA_ID
  });
  const sheets = response.result.sheets;
  const aba = sheets.find(s => s.properties.title === ABA);
  return aba ? aba.properties.sheetId : null;
}

carregarDados();
