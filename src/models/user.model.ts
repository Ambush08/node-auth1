import mongoose, {Schema, Model, Document} from 'mongoose';

export interface IUser extends Document {
    email: string,
    name: string,
    passwordHash: string,
    role: 'user' | 'admin',
    isEmailVerified: boolean,
    isLoggedIn: boolean,
    isTwoFactorEnabled: boolean,
    twoFactorSecret?: string,
    tokenVersion: number,
    resetPasswordToken?: string,
    resetPasswordExpires?: Date
}


const userSchema: Schema<IUser> = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 30
    },
    passwordHash: {
        type: String,
        required: true,
        trim: true,
        minLength: 8,
        select: false,
        maxLength: 100
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isLoggedIn: {
        type: Boolean,
        default: false
    },
    isTwoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: undefined,
        select: false
    },
    tokenVersion: {
        type: Number,
        default: 0
    },
    resetPasswordToken: {
        type: String,
        select: false,
        default: undefined
    },
    resetPasswordExpires: {
        type: Date,
        default: undefined
    }
}, {timestamps: true});

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);