#!/bin/bash

# Fonction pour tester la connexion à MySQL
check_mysql() {
    mysqladmin ping -h"$WORDPRESS_DB_HOST" -u"$WORDPRESS_DB_USER" -p"$WORDPRESS_DB_PASSWORD" > /dev/null 2>&1
}

echo "En attente de la base de données..."
until check_mysql; do
    echo "Base de données indisponible - attente..."
    sleep 2
done
echo "Base de données prête!"

# Exécute la commande passée en argument
exec "$@"