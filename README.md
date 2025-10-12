📝 QUICK REFERENCE: All Commands
To Start Everything (after initial setup):

Terminal 1 - Backend:
bashcd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000

Terminal 2 - CSS Build:
bashcd desktop-app
npx tailwindcss -i ./src/index.css -o ./dist/components/index.css --watch

Terminal 3 - JS Build:
bashcd desktop-app
npx babel src --out-dir dist --extensions .jsx,.js --watch

Terminal 4 - Electron App:
bashcd desktop-app
npm start