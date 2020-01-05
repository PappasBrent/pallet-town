const formInputIds = ["name", "set", "supertype", "types"]
const pageSize = 12

function clearElement(element) {
    while (element.firstChild) element.removeChild(element.firstChild)
}

function createCardImg(card) {
    const cardImg = document.createElement("div")
    cardImg.classList.add("card")
    cardImg.style.backgroundImage = `url(${card.imageUrl})`
    for (const key in card) cardImg.dataset[key] = card[key];
    return cardImg
}

function displayCards(searchCardGrid, userCardGrid, cards) {
    clearElement(searchCardGrid)
    cards.forEach(card => {
        const cardImg = createCardImg(card)
        cardImg.onclick = function () {
            for (let i = 0; i < userCardGrid.children.length; i++) {
                const existingCard = userCardGrid.children.item(i)
                if (existingCard.style.backgroundImage === cardImg.style.backgroundImage) {
                    existingCard.dataset.count = parseInt(existingCard.dataset.count) + 1
                    return
                }
            }

            const cardToAdd = createCardImg(card)
            cardToAdd.dataset.count = '1'
            cardToAdd.onclick = function () {
                this.dataset.count = parseInt(this.dataset.count) - 1
                if (parseInt(this.dataset.count) <= 0)
                    userCardGrid.removeChild(this)
            }
            userCardGrid.appendChild(cardToAdd)
        }
        searchCardGrid.appendChild(cardImg)
    })
}

// TODO: Paginate results
async function searchCards(searchCardGrid, userCardGrid) {
    clearElement(searchCardGrid)
    const formValues = {}
    formInputIds.forEach(id => formValues[id] = document.getElementById(id).value)
    const apiURL = "https://api.pokemontcg.io/v1/cards?"
    if (["energy", "trainer"].includes(formValues["supertype"])) formValues["types"] = ''
    let searchParams = new URLSearchParams(formValues)
    searchParams.set("pageSize", pageSize)

    const results = await fetch(apiURL + searchParams.toString()).then(res => res.json())
    displayCards(searchCardGrid, userCardGrid, results.cards)
}

function enableCardSearch(searchCardGrid, userCardGrid, inputFields) {
    clearElement(searchCardGrid)
    for (const inputField of inputFields) {
        inputField.addEventListener("input", () => searchCards(searchCardGrid, userCardGrid))
    }
}

function addOnClickToUserCards(userCardGrid) {
    const cardImgs = userCardGrid.querySelectorAll(".card")
    cardImgs.forEach(cardImg => {
        cardImg.onclick = function () {
            this.dataset.count = parseInt(this.dataset.count) - 1
            if (parseInt(this.dataset.count) <= 0)
                userCardGrid.removeChild(this)
        }
    })
}

// TODO: Reset export when deck is modified
function enableDeckExport(exportBtns, userCardGrid) {
    const reqBase = `${window.location.protocol}//${window.location.host}`
    for (const exportBtn of exportBtns) {
        exportBtn.dataset.clicked = "false"
        exportBtn.onclick = async function () {
            if (this.dataset.clicked === "true") return
            this.dataset.clicked = "true"

            const cardDivs = userCardGrid.querySelectorAll(".card")
            const cards = []
            cardDivs.forEach(cardDiv => cards.push({
                ...cardDiv.dataset
            }))

            this.innerText = "Loading..."

            try {
                const res = await fetch(`${reqBase}/make-deck/${exportBtn.dataset.exportType}`, {
                    method: "POST",
                    headers: new Headers({
                        "Content-Type": "application/json"
                    }),
                    body: JSON.stringify({
                        cards
                    })
                })
                const resJson = await res.json()
                if (!resJson.ok) {
                    this.innerText = "Error"
                    return
                } else {
                    const downloadHref = resJson.downloadHref
                    this.innerText = "Download now!"
                    this.setAttribute('href', downloadHref)
                    this.setAttribute('download', '')
                }
            } catch (error) {
                console.log(error)
            }
        }
    }
}

function enableDeckSave(saveDeckBtn, userCardGrid) {
    const reqBase = `${window.location.protocol}//${window.location.host}`
    saveDeckBtn.onclick = async function () {
        const cardDivs = userCardGrid.querySelectorAll(".card")
        const cards = []

        cardDivs.forEach(cardDiv => cards.push({
            ...cardDiv.dataset
        }))
        const deckName = document.getElementById("deckName").value

        let deckId = null
        if (saveDeckBtn.dataset.saveType === 'edit') {
            // get deckId from URL
            let path = window.location.pathname
            // trim trailing /
            while (path.endsWith("/")) path = path.slice(0, -1)
            deckId = path.slice(path.lastIndexOf('/'))
            // trim leading /
            while (deckId.startsWith('/')) deckId = deckId.slice(1)
        }

        this.innerText = "Loading..."

        try {
            const res = await fetch(`${reqBase}/decks/${saveDeckBtn.dataset.saveType}`, {
                method: "POST",
                headers: new Headers({
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify({
                    cards,
                    deckName,
                    deckId
                })
            })
            const resJson = await res.json()
            if (!resJson.ok) {
                this.classList.remove('btn-info')
                this.classList.add('btn-warning')
                this.innerText = resJson.errorMessage
                return
            } else {
                this.innerText = "Deck saved!"
                this.classList.remove('btn-warning')
                this.classList.add('btn-info')
            }
        } catch (error) {
            console.log(error)
        }
    }
}

function initCardSearch() {
    const searchCardGrid = document.querySelector('.card-search-grid')
    const userCardGrid = document.querySelector('.deck-grid')
    const inputFields = document.querySelectorAll(".card-search-form input, .card-search-form select")
    const exportBtns = document.querySelectorAll("a[data-export-type]")
    const saveDeckBtn = document.getElementById("saveDeckBtn")
    enableCardSearch(searchCardGrid, userCardGrid, inputFields)
    addOnClickToUserCards(userCardGrid)
    enableDeckExport(exportBtns, userCardGrid)
    if (saveDeckBtn != null) enableDeckSave(saveDeckBtn, userCardGrid)
}

if (document.readyState !== "loading") initCardSearch()
else {
    const interval = setInterval(() => {
        if (document.readyState !== 'loading') {
            initCardSearch()
            clearInterval(interval)
        }
    }, 1000);
}