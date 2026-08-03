# SetHours

SetHours is an iPhone-friendly television timesheet Progressive Web App.

## Features

- Live Clock In / Clock Out timer
- Break start and end tracking
- Paid travel hours
- Manual and overnight shifts
- Weekly timesheets
- Overtime and estimated pay
- Saved production profiles
- CSV export
- Print / Save as PDF
- JSON backup and restore
- Offline support
- Local, private storage

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload every file and folder from this package to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. GitHub will provide the public app address.

## Install on iPhone

1. Open the GitHub Pages address in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Confirm the name **SetHours**.

## Data

The app stores its data locally in the browser on the device. Use **More → Download Backup** regularly. Clearing Safari website data or deleting the site storage can remove local records.

## Updating the app

Replace the repository files with a newer version. When changing cached files, also update the `CACHE` name inside `service-worker.js`.


## iPhone icon refresh

This release includes dedicated Apple touch icons, a conventional root-level
`apple-touch-icon.png`, and iOS launch screens.

After replacing an older GitHub Pages version:

1. Delete the existing SetHours icon from the iPhone Home Screen.
2. In **Settings → Safari → Advanced → Website Data**, remove the old SetHours/GitHub Pages entry if the previous icon remains cached.
3. Reopen the published site in Safari and refresh it.
4. Wait a few seconds for the page to load fully.
5. Use **Share → Add to Home Screen** again.

Do not use a private-browsing tab when installing the app.
