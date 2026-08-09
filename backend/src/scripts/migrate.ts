import migrateMongo from 'migrate-mongo';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
    mongodb: {
        url: process.env.MONGODB_URI || "mongodb://localhost:27017",
        databaseName: "parcel-management",
        options: {
            useNewUrlParser: true, // removes a deprecation warning when connecting
            useUnifiedTopology: true, // removes a deprecating warning when connecting
        }
    },
    migrationsDir: path.join(__dirname, '..', 'migrations'),
    changelogCollectionName: "changelog",
    migrationFileExtension: ".ts",
    useFileHash: false,
    moduleSystem: 'commonjs',
};

// Set config
// @ts-ignore
migrateMongo.config.set(config);

export const runMigrations = async () => {
    try {
        console.log("Connecting to database for migrations...");
        const { db, client } = await migrateMongo.database.connect();
        console.log("Database connected. Running migrations...");

        const migrated = await migrateMongo.up(db, client);
        migrated.forEach((fileName: string) => console.log('Migrated:', fileName));

        console.log("Migrations completed successfully.");
        await client.close();
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

if (require.main === module) {
    runMigrations();
}
