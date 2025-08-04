const tabela = document.querySelector('#tabela tbody');
const filtro = document.getElementById('filtro');
const btnAdicionar = document.getElementById('btnAdicionar');
const modalDetalhes = document.getElementById('modalDetalhes');
const modalFormulario = document.getElementById('modalFormulario');
const form = document.getElementById('formulario');

let dadosPlanilha = [];
let modoEdicao = false;
let indiceEdicao = null;

const PLANILHA_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4';
const ABA = 'Página1';
const CLIENT_ID = '789808431754-iabrrvpv2hbej6eeffflfgdh12ic0kd4.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiIniciado = false;

function iniciarGapi() {
  return new Promise((resolve, reject) => {
    gapi.load('client', {
      callback: async () => {
        try {
          await gapi.client.init({
            apiKey: '', // vazio para usar OAuth
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          });
          gapiIniciado = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      onerror: () => reject('Erro ao carregar gapi client'),
      timeout: 5000,
      ontimeout: () => reject('Timeout ao carregar gapi client'),
    });
  });
}

function autenticarGoogle() {
  if (!gapiIniciado) {
    iniciarGapi().then(() => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Erro no token:', tokenResponse);
            return;
          }
          console.log('Autenticado com sucesso');
          carregarDados();
        },
      });
      tokenClient.requestAccessToken();
    }).catch(console.error);
  } else {
    tokenClient.requestAccessToken();
  }
}

// Adiciona o event listener para o botão de login
document.getElementById('btnLogin').addEventListener('click', autenticarGoogle);

async function carregarDados() {
  if (!gapiIniciado) {
    await iniciarGapi();
  }
  try {
    const resposta = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_ID,
      range: ABA,
    });

    const valores = resposta.result.values;
    if (!valores || valores.length === 0) {
      dadosPlanilha = [];
      exibirTabela([]);
      return;
    }

    const nomesColunas = valores[0];
    const linhas = valores.slice(1);

    dadosPlanilha = linhas.map(linha => {
      const item = {};
      nomesColunas.forEach((coluna, i) => {
        item[coluna] = linha[i] || '';
      });
      return item;
    });

    exibirTabela(filtrar(dadosPlanilha));
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
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

  const valores = [Object.values(dados)];

  try {
    if (modoEdicao) {
      const linha = indiceEdicao + 2; // +2 para considerar cabeçalho e índice 0
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: PLANILHA_ID,
        range: `${ABA}!A${linha}`,
        valueInputOption: 'RAW',
        resource: { values: valores },
      });
    } else {
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: PLANILHA_ID,
        range: `${ABA}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: valores },
      });
    }

    await carregarDados();
    form.reset();
    modoEdicao = false;
    esconderModal('modalFormulario');
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
  mostrarModal('modalFormulario');
});

document.querySelectorAll('.fechar').forEach(botao => {
  botao.addEventListener('click', () => {
    const id = botao.dataset.close;
    esconderModal(id);
  });
});

function filtrar(lista) {
  const termo = filtro.value.toLowerCase();
  return lista.filter(item => {
    return Object.values(item).some(valor =>
      valor.toString().toLowerCase().includes(termo)
    );
  });
}

function mostrarModal(id) {
  document.getElementById(id).classList.add('mostrar');
}

function esconderModal(id) {
  document.getElementById(id).classList.remove('mostrar');
}

// Expõe funções para o HTML
window.verDetalhes = verDetalhes;
window.editarItem = editarItem;

// Carrega dados na inicialização (sem necessidade de login para leitura pública)
carregarDados();
