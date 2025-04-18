import * as fs from 'fs';
import * as path from 'path';

const movePublicFiles = async () => {
    const sourceDir = path.join(__dirname, 'public');
    const destDir = path.join(__dirname, '../dist/public');

    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    try {
        // Read all files from source directory
        const files = fs.readdirSync(sourceDir);

        // Move each file
        files.forEach((file) => {
            const sourcePath = path.join(sourceDir, file);
            const destPath = path.join(destDir, file);

            // Move file
            fs.renameSync(sourcePath, destPath);
        });

        console.log('Public files moved successfully');
    } catch (error) {
        console.error('Error moving public files:', error);
        throw error;
    }
};

movePublicFiles();