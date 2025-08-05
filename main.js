const tabela = document.querySelector('#tabela tbody');
const filtro = document.getElementById('filtro');
const btnAdicionar = document.getElementById('btnAdicionar');
const btnLogin = document.getElementById('btnLogin');
const modalDetalhes = document.getElementById('modalDetalhes');
const modalFormulario = document.getElementById('modalFormulario');
const form = document.getElementById('formulario');

let dadosPlanilha = [];
let modoEdicao = false;
let indiceEdicao = null;

const PLANILHA_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4';
const ABA = 'Página1';
const API_KEY = 'AIzaSyAMEOQ4ElM803iRicZ0JggvANlZrOYHNT4';
const CLIENT_ID = '789808431754-iabrrvpv2hbej6eeffflfgdh12ic0kd4.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiIniciado = false;
let accessToken = null;  // Guarda o token atual

btnLogin.addEventListener('click', autenticarGoogle);

function iniciarGapi() {
  return new Promise((resolve, reject) => {
    gapi.load('client', {
      callback: async () => {
        try {
          await gapi.client.init({
            apiKey: API_KEY,
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

async function autenticarGoogle() {
  if (!gapiIniciado) {
    await iniciarGapi();
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse.error) {
        console.error('Erro no token:', tokenResponse);
        return;
      }
      accessToken = tokenResponse.access_token;  // salva token
      console.log('Autenticado com sucesso');
      carregarDados();
    },
  });

  // Solicita o token com popup na primeira vez
  tokenClient.requestAccessToken();
}

// Função para garantir que exista token válido antes da requisição API
async function garantirToken() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Erro no token:', tokenResponse);
            reject(tokenResponse.error);
            return;
          }
          accessToken = tokenResponse.access_token;
          resolve(accessToken);
        },
      });
    }

    if (accessToken) {
      // Token já existe, tenta renovar silenciosamente (sem popup)
      tokenClient.requestAccessToken({ prompt: '' });
      resolve(accessToken);
    } else {
      // Não tem token, pede com popup
      tokenClient.requestAccessToken();
      // A resolução vai acontecer no callback do tokenClient
      // Para isso, vamos escutar o callback do tokenClient para resolver a Promise
      // Porém, callback do tokenClient já faz resolve/reject acima, então aqui ok.
    }
  });
}

async function carregarDados() {
  try {
    if (!gapiIniciado) {
      await iniciarGapi();
    }

    await garantirToken();  // garante token válido antes da chamada

    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_ID,
      range: ABA,
    });

    const json = response.result;

    if (!json.values || json.values.length === 0) {
      dadosPlanilha = [];
      exibirTabela([]);
      return;
    }

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
	<button onclick="removerItem(${i})">Remover</button>
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
    if (!gapiIniciado) {
      await iniciarGapi();
    }

    await garantirToken();  // garante token antes de enviar

    if (modoEdicao) {
      const linha = indiceEdicao + 2;
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

async function removerItem(index) {
  const confirmacao = confirm("Tem certeza que deseja remover este item?");
  if (!confirmacao) return;

  try {
    if (!gapiIniciado) {
      await iniciarGapi();
    }

    await garantirToken();  // garante token antes da requisição

    const linhaParaDeletar = index + 1 + 1;

    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: PLANILHA_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: "ROWS",
                startIndex: linhaParaDeletar - 1,
                endIndex: linhaParaDeletar,
              },
            },
          },
        ],
      },
    });

    await carregarDados();
    alert("Item removido com sucesso.");
  } catch (err) {
    console.error("Erro ao remover item:", err);
    alert("Erro ao remover item.");
  }
}

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

// Inicializa gapi e tenta pegar token silenciosamente no carregamento da página
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await iniciarGapi();

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.warn('Token não obtido silenciosamente:', tokenResponse);
          return;
        }
        accessToken = tokenResponse.access_token;
        console.log('Token obtido silenciosamente');
        carregarDados();
      },
    });

    // Tenta obter token sem popup para login automático se autorizado
    tokenClient.requestAccessToken({ prompt: '' });
  } catch (err) {
    console.error('Erro na inicialização automática:', err);
  }
});

// Para usar nos botões inline no HTML
window.verDetalhes = verDetalhes;
window.editarItem = editarItem;
window.removerItem = removerItem;
