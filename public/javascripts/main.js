function closeIconEvent(e) {
    const msgBox = e.target.parentNode.parentNode;
    msgBox.style.display = "none"
}
closeIcon = icon => msgBox = icon.parentNode.parentNode.style.display = "none"

function closeAllIcons() {
    const closeIcons = document.querySelectorAll(".icon-close");
    closeIcons.forEach(icon => closeIcon(icon));
}

window.onload = () => {
    const closeIcons = document.querySelectorAll(".icon-close")
    closeIcons.forEach(icon => icon.addEventListener("click", closeIconEvent));
    window.addEventListener("keydown", (e) => {
        if (e.keyCode === 27) closeAllIcons()
    })
}