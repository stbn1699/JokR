import {UsersRepository} from "../repository/Users.repository.js";
import type {User} from "../models/User.model.js";
import bcrypt from "bcrypt";
import type {NewUser} from "../models/NewUser.model.js";

/*
 * Service métier pour les utilisateurs
 * - register : hash le mot de passe puis crée l'utilisateur via le repository
 * - authenticate : vérifie les identifiants (email/username + password)
 * - updateUserXpAndLevel : applique la logique de montée en niveau et persiste
 *
 * Remarques :
 * - `bcrypt.hash` utilise la variable d'environnement SALTROUNDS (ou 10 par défaut)
 * - Les mots de passe stockés sont déjà hashés et ne doivent pas être exposés
 */
export class UsersService {
    constructor(
        private repo: UsersRepository,
    ) {
    }

    // Inscription : hash du mot de passe avant insertion
    async register(user: NewUser): Promise<User> {
        const doubleHashed = await bcrypt.hash(user.password, process.env.SALTROUNDS || 10);
        return this.repo.create({...user, password: doubleHashed});
    }

    // Authentification : recherche par email ou username puis compare le hash
    async authenticate(identifier: string, password: string): Promise<User | null> {
        const user = identifier.includes('@') ? await this.repo.findByEmail(identifier) : await this.repo.findByUsername(identifier);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.password);
        return ok ? user : null;
    }

    // Lecture par UUID
    async findByUuid(uuid: string): Promise<User | undefined> {
        return this.repo.findByUuid(uuid);
    }

    // Ajoute de l'XP et gère la montée en niveau si le seuil est dépassé
    async updateUserXpAndLevel(userId: string, xpToAdd: number): Promise<void> {
        const user: User | undefined = await this.findByUuid(userId);

        if (!user) return;

        let newXp: number = user.user_xp + xpToAdd;
        let level: number = user.user_level;
        const xpToNextLevel: number = Math.ceil(
            120 * Math.pow(level, 1.4)
        )

        if (newXp >= xpToNextLevel) {
            level++;
            newXp = newXp - xpToNextLevel;
        }

        await this.repo.updateUserXpAndLevel(userId, newXp, level);
    }
}
