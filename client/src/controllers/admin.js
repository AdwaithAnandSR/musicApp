import axios from "@services/axios";

/**
 * Fetch all users (admin only).
 * @returns {Promise<Array>} array of user objects
 */
export const fetchAllUsers = async () => {
    const res = await axios.get("/auth/allUsers");
    return res.data; // array
};

/**
 * Set a user's verified status (admin only).
 * @param {string}  userId
 * @param {boolean} isVerified
 * @returns {Promise<object>} updated user
 */
export const setUserVerified = async (userId, isVerified) => {
    const res = await axios.post("/users/verify", { userId, isVerified });
    return res.data.user;
};

/**
 * Permanently delete a user account (admin only).
 * @param {string} userId
 * @returns {Promise<object>} { success, message }
 */
export const removeUser = async userId => {
    const res = await axios.post(`/users/delete`, { userId });
    return res.data;
};
