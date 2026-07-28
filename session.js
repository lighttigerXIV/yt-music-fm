class Session {
    constructor(token, username){
        this.token = token;
        this.username = username;
        this.loggedIn = token !== undefined && username !== undefined;
    }
}