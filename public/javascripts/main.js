function closeIconEvent(e) {
    const msgBox = e.target.parentNode.parentNode;
    msgBox.style.display = "none"
}

const closeIcon = icon => icon.parentNode.parentNode.style.display = "none"

function closeAllIcons() {
    const closeIcons = document.querySelectorAll(".icon-close");
    closeIcons.forEach(icon => closeIcon(icon));
}

function enableCardSearch() {
    const formInputIds = ["name", "set", "supertype", "types"]
    const searchCardGrid = document.querySelector('.card-search-grid')
    const userCardGrid = document.querySelector('.deck-grid')
    // TODO: Finish pagination
    const pageSize = 12

    function clearGrid(grid) {
        while (grid.firstChild) grid.removeChild(grid.firstChild)
    }

    async function searchCards() {
        clearGrid(searchCardGrid)
        const formValues = {}
        formInputIds.forEach(id => formValues[id] = document.getElementById(id).value)
        const apiURL = "https://api.pokemontcg.io/v1/cards?"
        if (["energy", "trainer"].includes(formValues["supertype"])) formValues["types"] = ''
        let searchParams = new URLSearchParams(formValues)
        searchParams.set("pageSize", pageSize)

        const results = await fetch(apiURL + searchParams.toString()).then(res => res.json())
        displayCards(results.cards)
    }

    function displayCards(cards) {
        clearGrid(searchCardGrid)
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

    function createCardImg(card) {
        const cardImg = document.createElement("div")
        cardImg.classList.add("card")
        cardImg.style.backgroundImage = `url(${card.imageUrl})`
        for (const key in card) cardImg.dataset[key] = card[key];
        return cardImg
    }

    clearGrid(searchCardGrid)
    const inputFields = document.querySelectorAll(".card-search-form input, .card-search-form select")
    for (const inputField of inputFields) {
        inputField.addEventListener("input", searchCards)
    }
}

// TODO: Reset export when deck is modified
function enableDeckExport() {
    const userCardGrid = document.querySelector('.deck-grid')
    const exportBtns = document.querySelectorAll("a[data-export-type]")
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

            const headers = new Headers()
            headers.set("content-type", "application/json")

            try {
                this.innerText = "Loading..."
                const res = await fetch(`make-deck/${exportBtn.dataset.exportType}`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        cards
                    })
                })
                const resJson = await res.json()
                if (!resJson.ok) {
                    this.innerText = "Error"
                    return
                }
                const downloadHref = resJson.downloadHref
                this.innerText = "Download now!"
                this.setAttribute('href', downloadHref)
                this.setAttribute('download', '')
            } catch (error) {
                console.log(error)
            }
        }
    }
}

function enableDeckSave() {
    const userCardGrid = document.querySelector('.deck-grid')
    const saveDeckBtn = document.getElementById("saveDeckBtn")
    if (saveDeckBtn === null) return
    saveDeckBtn.onclick = async function () {
        const cardDivs = userCardGrid.querySelectorAll(".card")
        const cards = []
        cardDivs.forEach(cardDiv => cards.push({
            ...cardDiv.dataset
        }))
        const deckName = document.getElementById("deckName").value

        const headers = new Headers()
        headers.set("content-type", "application/json")

        try {
            this.innerText = "Loading..."
            const res = await fetch('decks/save', {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    cards,
                    deckName
                })
            })
            const resJson = await res.json()
            if (!resJson.ok) {
                this.classList.remove('btn-info')
                this.classList.add('btn-warning')
                this.innerText = resJson.errorMessage
                return
            }
            this.innerText = "Deck saved!"
        } catch (error) {
            console.log(error)
        }
    }
}

function styleActiveTab() {
    const tabs = document.querySelectorAll("header .nav-ul li a")
    tabs.forEach(tab => {
        if (window.location.pathname === tab.getAttribute('href'))
            tab.classList.add("active-tab")
    })
}

window.onload = () => {
    styleActiveTab()

    const closeIcons = document.querySelectorAll(".icon-close")
    closeIcons.forEach(icon => icon.addEventListener("click", closeIconEvent));
    window.addEventListener("keydown", (e) => {
        if (e.keyCode === 27) closeAllIcons()
    })

    if (document.querySelector('.card-search')) {
        enableCardSearch()
        enableDeckExport()
        enableDeckSave()
    }
}