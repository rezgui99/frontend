# Utilise Node 22.11.0 LTS officiel
FROM node:22.11.0

# Crée un répertoire de travail
WORKDIR /usr/src/app

# Copie les fichiers package
COPY package*.json ./

# Installe les dépendances
RUN npm install

# Installation de nodemon en global
RUN npm install -g nodemon
# Copie le reste du code
COPY . .

# Expose le port
EXPOSE 3000

# Commande de démarrage
CMD ["nodemon", "server.js"]
