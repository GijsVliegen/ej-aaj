

// Function to get a random integer between min and max (inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to get a random element from a list
function getRandomElement(list) {
    if (!list.length) return null;
    return list[getRandomInt(0, list.length - 1)];
}