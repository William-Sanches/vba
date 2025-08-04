const tabela = document.querySelector('#tabela tbody')
const filtro = document.getElementById('filtro')
const btnAdicionar = document.getElementById('btnAdicionar')
const modalDetalhes = document.getElementById('modalDetalhes')
const modalFormulario = document.getElementById('modalFormulario')
const form = document.getElementById('formulario')

let dadosPlanilha = []
let modoEdicao = false
let indiceEdicao = null

const PLANILHA_ID = '10cf_fWxIKHR8M1xT419mPjNO4a8W1RFp7nLxLTS_nl4'
const ABA = 'Página1'
const API_KEY = 'AIzaSyAMEOQ4ElM803iRicZ0JggvANlZrOYHNT4'

async function carregarDados() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${PLANILHA_ID}/values/${ABA}?key=${API_KEY}`

    try {
        const res = await fetch(url)
        const json = await res.json()

        const nomesColunas = json.values[0]
        const linhas = json.values.slice(1)

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

form.addEventListener('submit', e => {
    e.preventDefault()

    const dados = {}
    const campos = form.querySelectorAll('input')

    campos.forEach(input => {
        dados[input.name] = input.value
    })

    if (modoEdicao) {
        dadosPlanilha[indiceEdicao] = dados
    } else {
        dadosPlanilha.push(dados)
    }

    form.reset()
    esconderModal('modalFormulario')
    modoEdicao = false
    exibirTabela(filtrar(dadosPlanilha))
})

filtro.addEventListener('input', () => {
    exibirTabela(filtrar(dadosPlanilha))
})

function filtrar(lista) {
    const termo = filtro.value.toLowerCase()
    return lista.filter(item => {
        return Object.values(item).some(valor => valor.toLowerCase().includes(termo))
    })
}

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

carregarDados()
