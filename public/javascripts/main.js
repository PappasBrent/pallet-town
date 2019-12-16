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
    const maxResultsPerPage = 10

    function clearGrid(grid) {
        while (grid.firstChild) grid.removeChild(grid.firstChild)
    }

    async function searchCards() {
        clearGrid(searchCardGrid)
        const formValues = {}
        formInputIds.forEach(
            id => formValues[id] = document.getElementById(id).value)
        const apiURL = "https://api.pokemontcg.io/v1/cards?"

        if (formValues["supertype"] !== "pokemon") formValues["types"] = ''

        let queryString = Object.keys(formValues).reduce((qs, key) => {
            const value = formValues[key]
            if (value.trim() == "") return qs
            return qs + `&${key}=${value}`
        }, "")
        queryString += `&pageSize=${maxResultsPerPage}`

        const results = await fetch(apiURL + queryString).then(res => res.json())
        displayCards(results.cards)
    }

    function createCardImg(cardUrl) {
        const cardImg = document.createElement("div")
        cardImg.classList.add("card")
        cardImg.style.backgroundImage = `url(${cardUrl})`
        return cardImg
    }

    function displayCards(cards) {
        clearGrid(searchCardGrid)
        cards.forEach(card => {

            const cardImg = createCardImg(card.imageUrl)
            cardImg.onclick = function () {
                for (let i = 0; i < userCardGrid.children.length; i++) {
                    const existingCard = userCardGrid.children.item(i)
                    if (existingCard.style.backgroundImage === cardImg.style.backgroundImage) {
                        existingCard.dataset.count = parseInt(existingCard.dataset.count) + 1
                        return
                    }
                }

                const cardToAdd = createCardImg(card.imageUrl)
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


    clearGrid(searchCardGrid)
    document.querySelector(".card-name-field > input").addEventListener("keyup", searchCards)
    document.querySelector(".expansion-name-field > input").addEventListener("keyup", searchCards)
    document.querySelector(".card-type-field > select").addEventListener("click", searchCards)
    document.querySelector(".pokemon-type-field > select").addEventListener("click", searchCards)
}

window.onload = () => {
    const closeIcons = document.querySelectorAll(".icon-close")
    closeIcons.forEach(icon => icon.addEventListener("click", closeIconEvent));
    window.addEventListener("keydown", (e) => {
        if (e.keyCode === 27) closeAllIcons()
    })

    if (document.querySelector('.card-search')) enableCardSearch()
}