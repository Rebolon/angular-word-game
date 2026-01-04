# Angular Word Game

A simple game that reproduce Boggle behavior.
You can select a kind of game (the Boggle one or a standard one) and play game. Words are validated versus a dictionnary. All dictionnaries are from this website : http://www.3zsoftware.com/fr/listes.php (I thought to use this one but files were too big).

## Technical information

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.0.5.

### Install 

Requirements:
* NodeJS 16+
* Npm

Run `npm install`

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.


### TODO

* Add points on the right of each word found
* Improve loding dictionnary : 
    * is there a way to make it faster ?
    * add a progress bar because for instance it uses toast and user doesn't know if it's still loading
* Centrer le chrono