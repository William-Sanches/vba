const tabela = document.querySelector('#tabela tbody')
const filtro = document.getElementById('filtro')
const btnAdicionar = document.getElementById('btnAdicionar')
const modalDetalhes = document.getElementById('modalDetalhes')
const modalFormulario = document.getElementById('modalFormulario')
const form = document.getElementById('formulario')
const btnLogin = document.getElementById('btnLogin')

let dadosPlanilha = []
let modoEdicao = false
let indiceEdicao = null

const PLANILHA_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4'
const ABA = 'Página1'
const CLIENT_ID = '789808431754-iabrrvpv2hbej6eeffflfgdh12ic0kd4.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

// Inicializa a API gapi e o cliente OAuth2
function iniciarGapi() {
    return new Promise((resolve) => {
        gapi.load('client:auth2', async () => {
            await gapi.client.init({
                apiKey: '', // não usado aqui, pois usamos OAuth
                clientId: CLIENT_ID,
                scope: SCOPES,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            })
            resolve()
        })
    })
}

async function autenticarGoogle() {
    await iniciarGapi()
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        await gapi.auth2.getAuthInstance().signIn()
    }
    carregarDados()
}

async function carregarDados() {
    try {
        await iniciarGapi()
        if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
            tabela.innerHTML = '<tr><td colspan="6">Faça login para ver os dados.</td></tr>'
            return
        }
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: PLANILHA_ID,
            range: ABA,
        })

        const nomesColunas = response.result.values[0]
        const linhas = response.result.values.slice(1)

        dadosPlanilha = linhas.map(linha => {
            const item = {}
            nomesColunas.forEach((coluna, i) => {
                item[coluna] = linha[i] || ''
            })
            return item
        })

        exibirTabela(filtrar(dadosPlanilha))
    } catch (erro) {
        console.error('Erro ao carregar dados:', erro)
        tabela.innerHTML = '<tr><td colspan="6">Erro ao carregar dados.</td></tr>'
    }
}

function exibirTabela(dados) {
    tabela.innerHTML = ''

    dados.forEach((item, i) => {
        const tr = document.createElement('tr')
        tr.innerHTML = `
            <td>${item['Codigo rms'] || ''}</td>
            <td>${item['Solicitado por:'] || ''}</td>
            <td>${item['Objeto da Compra'] || ''}</td>
            <td>${item['Valor'] || ''}</td>
            <td>${item['Data1'] || ''}</td>
            <td>
                <button onclick="verDetalhes(${i})">Ver</button>
                <button onclick="editarItem(${i})">Editar</button>
                <button onclick="deletarItem(${i})">Deletar</button>
            </td>
        `
        tabela.appendChild(tr)
    })
}

function verDetalhes(index) {
    const item = filtrar(dadosPlanilha)[index]
    const container = document.getElementById('detalhesContainer')
    container.innerHTML = ''

    for (const chave in item) {
        const p = document.createElement('p')
        p.innerHTML = `<strong>${chave}:</strong> ${item[chave]}`
        container.appendChild(p)
    }

    mostrarModal('modalDetalhes')
}

function editarItem(index) {
    const item = filtrar(dadosPlanilha)[index]
    const campos = form.querySelectorAll('input')

    campos.forEach(input => {
        input.value = item[input.name] || ''
    })

    modoEdicao = true
    indiceEdicao = index
    mostrarModal('modalFormulario')
}

form.addEventListener('submit', async e => {
    e.preventDefault()

    const dados = {}
    const campos = form.querySelectorAll('input')

    campos.forEach(input => {
        dados[input.name] = input.value
    })

    if (modoEdicao) {
        await editarLinha(indiceEdicao, dados)
    } else {
        await adicionarLinha(dados)
    }

    form.reset()
    esconderModal('modalFormulario')
    modoEdicao = false
    carregarDados()
})

filtro.addEventListener('input', () => {
    exibirTabela(filtrar(dadosPlanilha))
})

btnAdicionar.addEventListener('click', () => {
    form.reset()
    modoEdicao = false
    mostrarModal('modalFormulario')
})

document.querySelectorAll('.fechar').forEach(botao => {
    botao.addEventListener('click', () => {
        const id = botao.dataset.close
        esconderModal(id)
    })
})

function mostrarModal(id) {
    document.getElementById(id).classList.add('mostrar')
}

function esconderModal(id) {
    document.getElementById(id).classList.remove('mostrar')
}

function filtrar(lista) {
    const termo = filtro.value.toLowerCase()
    return lista.filter(item => {
        return Object.values(item).some(valor => valor.toLowerCase().includes(termo))
    })
}

// Função para adicionar linha na planilha
async function adicionarLinha(dados) {
    const valores = Object.values(dados)
    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: PLANILHA_ID,
            range: ABA,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [valores],
            },
        })
    } catch (erro) {
        console.error('Erro ao adicionar na planilha:', erro)
        alert('Erro ao adicionar dados na planilha.')
    }
}

// Função para editar linha na planilha
async function editarLinha(indice, dados) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: PLANILHA_ID,
            range: ABA,
        })
        const linhas = response.result.values
        const nomesColunas = linhas[0]
        const linhaIndice = indice + 1 // +1 pois a linha 0 é cabeçalho

        // Construir array de valores na ordem das colunas
        const valoresLinha = nomesColunas.map(col => dados[col] || '')

        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: PLANILHA_ID,
            range: `${ABA}!A${linhaIndice}:Z${linhaIndice}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [valoresLinha],
            },
        })
    } catch (erro) {
        console.error('Erro ao editar na planilha:', erro)
        alert('Erro ao editar dados na planilha.')
    }
}

// Função para deletar linha na planilha
async function deletarItem(index) {
    try {
        const sheetsApi = gapi.client.sheets.spreadsheets.batchUpdate
        const requests = [{
            deleteDimension: {
                range: {
                    sheetId: 0,
                    dimension: "ROWS",
                    startIndex: index + 1,
                    endIndex: index + 2
                }
            }
        }]

        await sheetsApi({
            spreadsheetId: PLANILHA_ID,
            resource: { requests }
        })

        carregarDados()
    } catch (erro) {
        console.error('Erro ao deletar linha:', erro)
        alert('Erro ao deletar a linha da planilha.')
    }
}

btnLogin.addEventListener('click', autenticarGoogle)

carregarDados()
