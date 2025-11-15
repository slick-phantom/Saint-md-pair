// gen-id.js (ES Module version)
export function makeid() {
    const prefix = "savy_dni_";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = prefix;
    
    // Generate 8 random characters after the prefix
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    
    return result;
}