const formInputIds = ["name", "set", "supertype", "types"]
const pageSize = 12

function clearElement(element) {
    while (element.firstChild) element.removeChild(element.firstChild)
}

function addPreviewMouseOver(cardImg) {
    // if card has count data attribute, then it is in the user's deck
    // and is on the right side of the screen
    cardImg.onmouseover = () => {
        const cardPreview = document.querySelector(`.preview[data-side=${typeof(cardImg.dataset['count']) == 'undefined' ? 'right' : 'left'}]`)
        cardPreview.dataset.visibility = "visible";
        cardPreview.style.backgroundImage = `url(${cardImg.dataset.imageurlhires})`
    }
    cardImg.onmouseleave = () => {
        const cardPreview = document.querySelector(`.preview[data-side=${typeof(cardImg.dataset['count']) == 'undefined' ? 'right' : 'left'}]`)
        cardPreview.dataset.visibility = "hidden"
        cardPreview.style.backgroundImage = null
    }
}

function createCardImg(card) {
    const cardImg = document.createElement("div")
    cardImg.classList.add("card")
    cardImg.style.backgroundImage = `url(${card.imageUrlHiRes})`
    addPreviewMouseOver(cardImg)
    for (const key in card) cardImg.dataset[key.toLowerCase()] = card[key];
    return cardImg
}

function displayCards(searchCardGrid, userCardGrid, cardCountDiv, cards) {
    clearElement(searchCardGrid)
    cards.forEach(card => {
        const cardImg = createCardImg(card)
        cardImg.onclick = function () {
            cardCountDiv.dataset.count = parseInt(cardCountDiv.dataset.count) + 1
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
                cardCountDiv.dataset.count = parseInt(cardCountDiv.dataset.count) - 1
            }
            userCardGrid.appendChild(cardToAdd)
        }
        searchCardGrid.appendChild(cardImg)
    })
}

// TODO: Paginate results
async function searchCards(searchCardGrid, userCardGrid, cardCountDiv) {
    clearElement(searchCardGrid)
    const formValues = {}
    formInputIds.forEach(id => formValues[id] = document.getElementById(id).value)
    const apiURL = "https://api.pokemontcg.io/v1/cards?"
    if (["energy", "trainer"].includes(formValues["supertype"])) formValues["types"] = ''
    let searchParams = new URLSearchParams(formValues)
    // searchParams.set("pageSize", pageSize)

    const results = await fetch(apiURL + searchParams.toString()).then(res => res.json())
    displayCards(searchCardGrid, userCardGrid, cardCountDiv, results.cards)
}

function enableCardSearch(searchCardGrid, userCardGrid, cardSearchForm, cardCountDiv) {
    clearElement(searchCardGrid)
    const inputFields = cardSearchForm.querySelectorAll("input")
    const selectFields = cardSearchForm.querySelectorAll("select")
    cardSearchForm.addEventListener("submit", (e) => {
        e.preventDefault()
        searchCards(searchCardGrid, userCardGrid, cardCountDiv)
    })
    // for (const inputField of inputFields) {
    //     inputField.addEventListener("input", () => searchCards(searchCardGrid, userCardGrid, cardCountDiv))
    // }
    for (const selectField of selectFields) {
        selectField.addEventListener("input", () => searchCards(searchCardGrid, userCardGrid, cardCountDiv))
    }
}

function addOnClickToUserCards(userCardGrid, cardCountDiv) {
    let count = 0
    const cardImgs = userCardGrid.querySelectorAll(".card")
    cardImgs.forEach(cardImg => {
        cardImg.onclick = function () {
            cardCountDiv.dataset.count = parseInt(cardCountDiv.dataset.count) - 1
            this.dataset.count = parseInt(this.dataset.count) - 1
            if (parseInt(this.dataset.count) <= 0)
                userCardGrid.removeChild(this)
        }
        addPreviewMouseOver(cardImg)
        count += parseInt(cardImg.dataset.count)
    })
    cardCountDiv.dataset.count = count
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
    const cardSearchForm = document.querySelector('.card-search-form')
    const exportBtns = document.querySelectorAll("a[data-export-type]")
    const saveDeckBtn = document.getElementById("saveDeckBtn")
    const cardCountDiv = document.getElementById("card-count")
    enableCardSearch(searchCardGrid, userCardGrid, cardSearchForm, cardCountDiv)
    addOnClickToUserCards(userCardGrid, cardCountDiv)
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