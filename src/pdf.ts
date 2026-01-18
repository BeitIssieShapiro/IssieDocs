import PDFDocument from '@react-pdf/pdfkit';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer'; // Ensure buffer is available in your RN environment
import { ImageSize } from 'react-native';
import { _androidFileName } from './filesystem';

export interface GeneratePDFProps {
  uri: string;
  size: ImageSize;
  ratio: number;
  originalPageHeight: number; // Original page height without extension
  // audioFiles: {
  //   audioFileAnnotation: {
  //     src: string;
  //     name: string;
  //     description: string;
  //   },
  //   x: number;
  //   y: number;
  //   size: number;
  // }[];
}

/**
 * Generates a PDF file from an array of base64 image strings.
 * Each image will occupy one page in the PDF.
 *
* @param {string} name - the file name to be used
* @param {any[]} base64Images - Array of base64-encoded image strings
 * @return {Promise<string>} - A local file path to the generated PDF
 */
export async function generatePDF(name: string, base64Images: GeneratePDFProps[]) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Create a new PDF document
      const doc = new PDFDocument({
        autoFirstPage: false, // We'll manually add pages
      });

      // 2. Accumulate PDF data in buffers
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', (err) => reject(err));

      // 3. When the document ends, write the PDF buffer to a file
      doc.on('end', async () => {
        const pdfData = Buffer.concat(chunks); // Combine all data chunks

        // Write the PDF to the app's document directory
        const fileName = `${name}.pdf`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        try {
          await RNFS.writeFile(_androidFileName(filePath), pdfData.toString('base64'), 'base64');
          resolve(filePath); // Return the local PDF path
        } catch (fileErr) {
          reject(fileErr);
        }
      });

      // 4. Add each base64 image on its own page
      for (let i = 0; i < base64Images.length; i++) {
        const base64 = base64Images[i].uri;
        const size = base64Images[i].size;
        //const r = base64Images[i].ratio;
        let originalPageHeight = size.height;

        // Determine if page needs to be split
        const isExtended = base64Images[i].originalPageHeight > 0 && size.height > base64Images[i].originalPageHeight;
        if (isExtended) {
          originalPageHeight = base64Images[i].originalPageHeight;
        }
        const numPages = isExtended ? Math.ceil(size.height / originalPageHeight) : 1;


        // Add a page for each section
        for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
          doc.addPage({
            size: originalPageHeight > size.width ? [size.width, originalPageHeight] : [originalPageHeight, size.width],
            layout: originalPageHeight > size.width ? "portrait" : "landscape",
            margins: 0,
          });

          // // Add audio files if exist (all added to current - last add page)
          // for (const audio of base64Images[i].audioFiles) {
          //   const fileOptions = {
          //     src: audio.audioFileAnnotation.src,
          //     name: audio.audioFileAnnotation.name,
          //     type: 'audio/mpeg',
          //     description: audio.audioFileAnnotation.description,
          //     creationDate: new Date(),
          //     modifiedDate: new Date(),
          //     relationship: "Supplement",
          //   };
          //   const options = { Name: 'Paperclip' }
          //   doc.fileAnnotation(0,0, 100,100, fileOptions, options)
          // }

          // Clean the base64 string if it includes `data:image/...;base64,`
          const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

          // Calculate the y-offset for this section of the extended page
          const yOffset = pageIdx * originalPageHeight;

          // Insert the image at (x=0, y=0), but crop to show only this section
          doc.image(Buffer.from(cleanedBase64, 'base64'), 0, -yOffset , {
            fit: [size.width, size.height],
            align: 'center',
            valign: 'top',
          });
        }
      }

      // 5. Finalize the PDF
      return doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
