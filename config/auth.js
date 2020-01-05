module.exports = {
    // TODO: Find out how to send user to requested page after logging in
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) return next()
        req.flash("errorMessage", "You must be logged in to view this page")
        res.redirect("/users/login")
    },
    forwardAuthenticated: (req, res, next) => {
        if (!req.isAuthenticated()) return next()
        res.redirect('/')
    }
}