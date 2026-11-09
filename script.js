// endereços

const urlEstados = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

const lista = document.querySelector('.lista-de-estados');
const status = document.querySelector('.status');
const busca = document.querySelector('#busca');
const ordem = document.querySelector('#ordem');
const botoesRegiao = document.querySelectorAll('.opcao-regiao');
const botaoFavoritos = document.querySelector('.botao-favoritos');

// dados

let estados = [];
let regiaoSelecionada = '';
let somenteFavoritos = false;

// favoritos

let favoritos = JSON.parse(
    localStorage.getItem('estados-favoritos') || '[]'
);

const municipiosCache = {};

function mostrarEsqueletos() {
    lista.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        const card = document.createElement('li');
        card.classList.add('estado', 'esqueleto');
        lista.appendChild(card);
    }
}

// estados

async function buscarEstados() {
    mostrarEsqueletos();
    status.textContent = 'Carregando os estados...';

    try {
        const resposta = await fetch(urlEstados);

        if (!resposta.ok) {
            throw new Error('Erro ao buscar os estados.');
        }

        estados = await resposta.json();

        console.log(estados);
        console.log('Total de estados:', estados.length);

        status.textContent = `Chegaram ${estados.length} estados.`;

        atualizarTela();

    } catch (erro) {
        console.error(erro);

        lista.innerHTML = '';
        status.textContent = 'Não foi possível carregar os estados. Tente novamente.';
        status.classList.add('erro');
    }
}

function normalizar(texto) {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function filtrarPorNome() {
    const texto = normalizar(busca.value.trim());

    return estados.filter(estado =>
        normalizar(estado.nome).includes(texto)
    );
}

function filtrarPorRegiao(listaEstados) {
    return listaEstados.filter(estado =>
        regiaoSelecionada === '' ||
        estado.regiao.nome === regiaoSelecionada
    );
}

function filtrarFavoritos(listaEstados) {
    if (!somenteFavoritos) {
        return listaEstados;
    }

    return listaEstados.filter(estado =>
        favoritos.includes(estado.sigla)
    );
}

function ordenarEstados(listaEstados) {
    const copia = [...listaEstados];

    if (ordem.value === 'nome') {
        copia.sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR')
        );
    }

    if (ordem.value === 'nome-invertido') {
        copia.sort((a, b) =>
            b.nome.localeCompare(a.nome, 'pt-BR')
        );
    }

    if (ordem.value === 'regiao') {
        copia.sort((a, b) => {
            const comparacaoRegiao = a.regiao.nome.localeCompare(
                b.regiao.nome,
                'pt-BR'
            );

            if (comparacaoRegiao !== 0) {
                return comparacaoRegiao;
            }

            return a.nome.localeCompare(b.nome, 'pt-BR');
        });
    }

    return copia;
}

function contarPorRegiao(listaEstados, regiao) {
    return listaEstados.filter(estado =>
        regiao === '' || estado.regiao.nome === regiao
    ).length;
}

function salvarFavoritos() {
    localStorage.setItem(
        'estados-favoritos',
        JSON.stringify(favoritos)
    );
}

function montarUrlDosMunicipios(sigla) {
    return `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios`;
}

async function contarMunicipios(sigla) {
    if (municipiosCache[sigla] !== undefined) {
        return municipiosCache[sigla];
    }

    const resposta = await fetch(montarUrlDosMunicipios(sigla));

    if (!resposta.ok) {
        throw new Error('Não foi possível buscar os municípios.');
    }

    const municipios = await resposta.json();

    municipiosCache[sigla] = municipios.length;

    return municipios.length;
}

function atualizarContagens(listaEstados) {
    botoesRegiao.forEach(botao => {
        const regiao = botao.dataset.regiao;

        const quantidade = contarPorRegiao(
            listaEstados,
            regiao
        );

        botao.querySelector('.quantidade').textContent =
            `(${quantidade})`;
    });
}

// card

function criarCard(estado) {
    const card = document.createElement('li');

    card.classList.add('estado');
    card.dataset.regiao = estado.regiao.nome;

    const jaFavorito = favoritos.includes(estado.sigla);

    card.innerHTML = `
        <p class="estado-sigla">${estado.sigla}</p>

        <h2 class="estado-nome">${estado.nome}</h2>

        <p class="estado-regiao">${estado.regiao.nome}</p>

        <p class="estado-municipios"></p>

        <div class="estado-acoes">

            <button type="button" class="botao-municipios">
                Quantos municípios?
            </button>

            <button
                type="button"
                class="botao-favorito ${jaFavorito ? 'favorito' : ''}"
                aria-label="Favoritar ${estado.nome}"
                aria-pressed="${jaFavorito}"
            >
                ${jaFavorito ? '★' : '☆'}
            </button>

        </div>
    `;

    const textoMunicipios = card.querySelector('.estado-municipios');

    if (municipiosCache[estado.sigla] !== undefined) {
        textoMunicipios.textContent =
            `${municipiosCache[estado.sigla]} municípios`;
    }

    // municípios

    const botaoMunicipios = card.querySelector('.botao-municipios');

    botaoMunicipios.addEventListener('click', async () => {

        textoMunicipios.classList.remove('erro');
        textoMunicipios.classList.add('buscando');

        botaoMunicipios.disabled = true;
        textoMunicipios.textContent = 'Buscando...';

        try {
            const quantidade = await contarMunicipios(estado.sigla);

            textoMunicipios.textContent =
                `${quantidade} municípios`;

        } catch (erro) {
            console.error(erro);

            textoMunicipios.textContent =
                'Não foi possível falar com o IBGE. Tente de novo.';

            textoMunicipios.classList.add('erro');

        } finally {
            textoMunicipios.classList.remove('buscando');
            botaoMunicipios.disabled = false;
        }
    });

    // botão favorito

    const botaoFavorito = card.querySelector('.botao-favorito');

    botaoFavorito.addEventListener('click', () => {

        if (favoritos.includes(estado.sigla)) {
            favoritos = favoritos.filter(
                sigla => sigla !== estado.sigla
            );
        } else {
            favoritos.push(estado.sigla);
        }

        salvarFavoritos();
        atualizarTela();
    });

    return card;
}

function desenharEstados(listaEstados) {
    lista.innerHTML = '';

    listaEstados.forEach(estado => {
        const card = criarCard(estado);
        lista.appendChild(card);
    });
}

function atualizarTela() {

    let resultado = filtrarPorNome();

    const resultadoParaContagem = filtrarFavoritos(resultado);

    atualizarContagens(resultadoParaContagem);

    resultado = filtrarPorRegiao(resultado);
    resultado = filtrarFavoritos(resultado);

    resultado = ordenarEstados(resultado);

    desenharEstados(resultado);

    const quantidade = resultado.length;

    status.classList.remove('erro');

    if (quantidade === 0) {
        status.textContent = 'Nenhum estado encontrado.';
    } else if (quantidade === 1) {
        status.textContent = '1 estado encontrado.';
    } else {
        status.textContent = `${quantidade} estados encontrados.`;
    }
}

busca.addEventListener('input', () => {
    atualizarTela();
});

document.querySelector('.filtros').addEventListener('submit', evento => {
    evento.preventDefault();
});

ordem.addEventListener('change', () => {
    atualizarTela();
});

botoesRegiao.forEach(botao => {

    botao.addEventListener('click', () => {

        regiaoSelecionada = botao.dataset.regiao;

        botoesRegiao.forEach(item => {
            item.classList.remove('ativo');
        });

        botao.classList.add('ativo');

        atualizarTela();
    });
});

document.querySelectorAll('.opcao-regiao').forEach(opcao => {

    opcao.addEventListener('click', () => {

        regiaoSelecionada = opcao.dataset.regiao;

        botoesRegiao.forEach(botao => {
            botao.classList.remove('ativo');
        });

        opcao.classList.add('ativo');

        atualizarTela();

        opcao.blur();
    });
});

//favoritos

botaoFavoritos.addEventListener('click', () => {

    somenteFavoritos = !somenteFavoritos;

    botaoFavoritos.classList.toggle('ativo', somenteFavoritos);

    atualizarTela();
});

buscarEstados();
