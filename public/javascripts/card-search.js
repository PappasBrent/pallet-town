const formInputIds = ["name", "set", "supertype", "types"]
const pageSize = 12
// have to find some way to save anonymous decks, I don't like using globals tho
let originalDeckName = ''

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

function displayCards(searchCardGrid, userCardGrid, cardCountDiv, cards, saveDeckBtn) {
    clearElement(searchCardGrid)
    cards.forEach(card => {
        const cardImg = createCardImg(card)
        cardImg.onclick = function () {
            cardCountDiv.dataset.count = parseInt(cardCountDiv.dataset.count) + 1
            enableDeckExport(saveDeckBtn, userCardGrid)
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
                if (parseInt(this.dataset.count) <= 0) {
                    // dispatch to remove preview
                    this.dispatchEvent(new MouseEvent("mouseleave"))
                    userCardGrid.removeChild(this)
                }
                cardCountDiv.dataset.count = parseInt(cardCountDiv.dataset.count) - 1
                enableDeckExport(saveDeckBtn, userCardGrid)
            }
            userCardGrid.appendChild(cardToAdd)
        }
        searchCardGrid.appendChild(cardImg)
    })
}

// TODO: Paginate results
async function searchCards(searchCardGrid, userCardGrid, cardCountDiv, saveDeckBtn) {
    clearElement(searchCardGrid)
    const formValues = {}
    formInputIds.forEach(id => formValues[id] = document.getElementById(id).value)
    const apiURL = "https://api.pokemontcg.io/v1/cards?"
    if (["energy", "trainer"].includes(formValues["supertype"])) formValues["types"] = ''
    let searchParams = new URLSearchParams(formValues)
    // searchParams.set("pageSize", pageSize)

    const results = await fetch(apiURL + searchParams.toString()).then(res => res.json())
    displayCards(searchCardGrid, userCardGrid, cardCountDiv, results.cards, saveDeckBtn)
}

function enableCardSearch(searchCardGrid, userCardGrid, cardSearchForm, cardCountDiv, saveDeckBtn) {
    clearElement(searchCardGrid)
    const inputFields = cardSearchForm.querySelectorAll("input")
    const selectFields = cardSearchForm.querySelectorAll("select")
    cardSearchForm.addEventListener("submit", (e) => {
        e.preventDefault()
        searchCards(searchCardGrid, userCardGrid, cardCountDiv, saveDeckBtn)
    })
    // for (const inputField of inputFields) {
    //     inputField.addEventListener("input", () => searchCards(searchCardGrid, userCardGrid, cardCountDiv,))
    // }
    for (const selectField of selectFields) {
        selectField.addEventListener("input", () => searchCards(searchCardGrid, userCardGrid, cardCountDiv, saveDeckBtn))
    }
}

function addOnClickToUserCards(userCardGrid, cardCountDiv, saveDeckBtn) {
    let count = 0
    const cardImgs = userCardGrid.querySelectorAll(".card")
    cardImgs.forEach(cardImg => {
        // todo: Make this onclick into a function since it used in displayCards as well
        cardImg.onclick = function () {
            this.dataset.count = parseInt(this.dataset.count) - 1
            if (parseInt(this.dataset.count) <= 0) {
                // dispatch to remove preview
                this.dispatchEvent(new MouseEvent("mouseleave"))
                userCardGrid.removeChild(this)
            }
            cardCountDiv.dataset.count = parseInt(cardCountDiv.dataset.count) - 1
            enableDeckExport(saveDeckBtn, userCardGrid)
        }
        addPreviewMouseOver(cardImg)
        count += parseInt(cardImg.dataset.count)
    })
    cardCountDiv.dataset.count = count
}

function enableDeckExport(saveDeckBtn, userCardGrid) {
    const exportBtns = document.querySelectorAll("a[data-export-type]")
    const reqBase = `${window.location.protocol}//${window.location.host}`
    // TODO: use a closure or something to save the value of the export message, then restore it upon deck export enable
    // instead of directly setting it like this
    const exportTypeMsg = {
        "tts": "Export to Tabletop",
        "txt": "Export deck list to text file"
    }
    for (const exportBtn of exportBtns) {
        const exportType = exportBtn.dataset.exportType
        exportBtn.classList.remove("btn-warning")
        exportBtn.classList.add("btn-info")
        exportBtn.removeAttribute("download")
        exportBtn.dataset.clicked = "false"
        exportBtn.setAttribute("href", "#")
        exportBtn.innerText = exportTypeMsg[exportType]
        exportBtn.onclick = async function () {
            if (this.dataset.clicked === "true") return
            this.dataset.clicked = "true"

            const cardDivs = userCardGrid.querySelectorAll(".card")
            const cards = []
            cardDivs.forEach(cardDiv => cards.push({
                ...cardDiv.dataset
            }))

            // check for correct number of unique cards
            if (exportType === 'tts' && ((cards.length <= 1) || (cards.length >= 60))) {
                this.innerText = "Deck must have at least 2 and no more than 59 unique cards if exporting to tabletop"
                this.classList.remove("btn-info")
                this.classList.add("btn-warning")
                return
            }

            this.innerText = "Loading..."

            try {
                const res = await fetch(`${reqBase}/make-deck/${exportType}`, {
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
                    this.classList.remove("btn-info")
                    this.classList.add("btn-warning")
                    return
                } else {
                    const deckName = document.getElementById("deckName").value
                    const downloadHref = resJson.downloadHref
                    this.innerText = "Download now!"
                    this.setAttribute('href', downloadHref)
                    this.setAttribute('download', deckName.trim())
                }
            } catch (error) {
                console.log(error)
            }
        }
    }
    // putting this here will do for now
    const deckNameInput = document.getElementById('deckName')
    deckNameInput.oninput = enableDeckSave(saveDeckBtn, userCardGrid)
}

function enableDeckSave(saveDeckBtn, userCardGrid) {
    const reqBase = `${window.location.protocol}//${window.location.host}`
    saveDeckBtn.classList.remove("btn-warning")
    saveDeckBtn.classList.add("btn-info")
    saveDeckBtn.innerText = "Save deck"
    saveDeckBtn.onclick = async function () {
        const cardDivs = userCardGrid.querySelectorAll(".card")
        const cards = []

        cardDivs.forEach(cardDiv => cards.push({
            ...cardDiv.dataset
        }))
        const deckName = document.getElementById("deckName").value

        // check if saving anonymously via localStorage, return out early when done
        if (saveDeckBtn.dataset.saveType === 'localStorage') {
            if (deckName === '') {
                this.classList.remove('btn-info')
                this.classList.add('btn-warning')
                this.innerText = 'Please enter non-empty deck name'
                return
            }
            const savedDecks = JSON.parse(localStorage.getItem('decks') || '[]')
            const deckToEdit = {
                deckName,
                cards
            }
            const deckToReplaceIndex = savedDecks.findIndex(deck => deck.deckName === originalDeckName)
            if (deckToReplaceIndex != -1) {
                savedDecks.splice(deckToReplaceIndex, 1)
            }
            savedDecks.push(deckToEdit)

            localStorage.setItem('decks', JSON.stringify(savedDecks))

            // end it here
            originalDeckName = deckName // update saved deck name
            this.innerText = "Deck saved!"
            this.classList.remove('btn-warning')
            this.classList.add('btn-info')
            return
        }


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

function loadLocalStorageDecks(userCardGrid) {
    const deckToEdit = JSON.parse(localStorage.getItem('deckToEdit') || '{deckName:"",cards:[]}')
    originalDeckName = deckToEdit.deckName
    document.getElementById('deckName').value = originalDeckName
    for (const card of deckToEdit.cards) {
        const cardDiv = document.createElement('DIV')
        cardDiv.classList.add('card')
        cardDiv.style.backgroundImage = `url(${card.imageurlhires})`
        for (const prop in card) {
            cardDiv.dataset[prop] = card[prop]
        }
        userCardGrid.appendChild(cardDiv)
    }
}

function enableLocalStorageDeckDelete(deleteDeckBtn) {
    deleteDeckBtn.onclick = function (e) {
        e.preventDefault()
        const savedDecks = JSON.parse(localStorage.getItem('decks') || '[]')
        const deckToRemoveIndex = savedDecks.findIndex(deck => deck.deckName === originalDeckName)
        if (deckToRemoveIndex != -1) {
            savedDecks.splice(deckToRemoveIndex, 1)
        }
        localStorage.setItem('decks', JSON.stringify(savedDecks))
        window.location.href = '/decks/decksByUser'
    }
}

function initCardSearch() {
    const searchCardGrid = document.querySelector('.card-search-grid')
    const userCardGrid = document.querySelector('.deck-grid')
    const cardSearchForm = document.querySelector('.card-search-form')
    const saveDeckBtn = document.getElementById("saveDeckBtn")
    const deleteDeckBtn = document.getElementById('deleteDeckBtn')
    const cardCountDiv = document.getElementById("card-count")
    enableCardSearch(searchCardGrid, userCardGrid, cardSearchForm, cardCountDiv, saveDeckBtn)
    enableDeckExport(saveDeckBtn, userCardGrid)
    enableDeckSave(saveDeckBtn, userCardGrid)
    // load anonymous decks
    const href = window.location.href
    if (href.endsWith('edit') || href.endsWith('edit/')) {
        loadLocalStorageDecks(userCardGrid)
        enableLocalStorageDeckDelete(deleteDeckBtn)
    } else {
        // if on a page with this script, must be editing a new deck
        deleteDeckBtn.parentElement.removeChild(deleteDeckBtn)
    }
    addOnClickToUserCards(userCardGrid, cardCountDiv, saveDeckBtn)
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