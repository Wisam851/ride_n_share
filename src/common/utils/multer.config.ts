import { diskStorage } from 'multer';
import { extname, resolve } from 'path';

export const multerConfig = (destination: string) => ({
  storage: diskStorage({
    destination: resolve(process.cwd(), destination),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      cb(null, filename);
    },
  }),
});
