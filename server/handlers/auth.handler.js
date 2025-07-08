import User from "../models/users.js";

export const auth = async (req, res) => {
    try {
        const { userId } = req.body;

        const exists = await User.findOne({ userId });

        console.log(exists);

        if (exists) {
            return res.json({
                success: true,
                user: exists
            });
        }

        const newUser = await User.create({ userId });

        console.log("newUser: ", newUser);

        return res.json({
            success: true,
            user: newUser
        });
    } catch (error) {
        console.error(error);
    }
};

export const allUsers = async (req, res) => {
    try {
        const users = await User.find({});

        res.send(users);
    } catch (error) {
        console.error(error);
    }
};

export const authenticate = async (req, res) => {
    try {
        let { userId, auth } = req.query;

        auth = auth === "true";
        console.log(userId, auth, typeof auth);

        if (!userId || typeof auth != "boolean")
            return res.send("check query parameters!!!");

        const user = await User.findOneAndUpdate(
            { userId },
            { $set: { isAuthenticated: auth } },
            { new: true }
        );

        if (!user) return res.send("user not exists");

        res.send(user);
    } catch (error) {
        console.error(error);
    }
};
