.. Authors : 
.. mviewer team

.. _param_data:

2) Thématiques & données
=========================

Définir les thématiques et les données de son application.

.. image:: ../_images/user/mviewerstudio_2_thematiques.png
              :alt: Définition thématique
              :align: center

Paramétrer ses thématiques
-------------------------------------------

L'utilisateur peut organiser le panneau des thématiques et des données présentes à gauche de l'application.

Le mot "données" correspond à un ou des jeu(x) de données que vous souhaitez ajouter à votre application. Vous avez la possibilité de regrouper un ou plusieurs jeux de données sous une "thématique". Exemple, je veux ajouter les deux couches de données (linéaire du plan vélo et des abris vélo) sous une thématique "Plan Vélo".

Deux options sont offertes à l'utilisateur pour définir ses thématiques :

  1. Ajouter : pour créer votre thématique et y associer vos jeux de données "métier"
  2. Importer : pour réutiliser une thématique déjà créée au sein de la communauté mviewer (ex. la thématique des découpages territoriaux qui contient les limites de communes, EPCI et départements)

Option - Ajouter une thématique
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

En cliquant sur le bouton ajouter une thématique, le paramétrage de la thématique s'active.

.. image:: ../_images/user/mviewerstudio_2_thematiques_creer.png
              :alt: Création thématique
              :align: center

- |icone| : sélectionner l'icône illustrant la thématique. La recherche s'effectue en anglais.

- ``Nom`` : renseigner le nom de la thématique (ex. Ports).

- ``Déroulée par défaut`` : option permettant d'afficher le contenu de la thématique par défaut.

- ``Ajouter un groupe`` : ajout d'un groupe au sein de la thématique.

- ``Ajouter une donnée`` : ajout d'une donnée au sein de la thématique. Par défaut, la donnée sera sans aucun groupe (si des groupes on été créés).

- |deplacement| : déplacer la thématique via drag and drop.

- |suppression| : supprime la thématique.


Option - Importer une thématique externe
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

En cliquant sur Importer, vous pouvez importer une·des thématique·s existante·s (voir option external_themes dans :ref:`config_front`).

.. image:: ../_images/user/mviewerstudio_2_thematiques_importer.png
              :alt: Import thématique
              :align: center

Il est possible de filtrer les thématiques à l'aide de la barre de recherche en saisissant un mot clé (thème, organisme) et de gérer l'affichage des thématiques grâce au système de pagination.

Les thématiques importées ne sont pas configurables, elles sont visibles dans l'application comme elles sont définies dans l'application source (nom, icône, données et options des données).
Il est toutefois possible de gérer certains paramètres. Dans la liste des thématiques, cliquez sur le bouton |parametrage|.

.. |parametrage| image:: ../_images/user/mviewerstudio_2_parametrage.png
              :alt: Editer cette donnée 
	      :width: 20 pt

.. image:: ../_images/user/mviewerstudio_2_thematiques_options.png
              :alt: Options thématique externe
              :align: center

Une nouvelle fenêtre s'ouvre avec l'option suivante : 

- ``Affichage des données de la thématique`` : Option permettant de gérer l'affichage des données de la thématique lors du démarrage de l'application : tout afficher, rien ou comme dans l'application source.

Ajouter une donnée
-------------------------------------------

Le bouton |ajout_donnees| permet d'ajouter des données dans l'application.

L'ajout d'un nouveau jeu de données peut se faire avec une recherche dans un catalogue ou en saisissant les paramètres de base.

.. |ajout_donnees| image:: ../_images/user/mviewerstudio_2_thematiques_bouton_ajouter_donnees.png
  :alt: Ajouter une donnée 
  :width: 100 pt

Ajouter une donnée depuis un catalogue
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Vous pouvez chercher un jeu de données dans un catalogue (ex. Région Bretagne). Vous pouvez valider votre recherche en tapant sur la touche Entrée de votre clavier ou sur l'icone loupe :

.. image:: ../_images/user/mviewerstudio_2_thematiques_donnees.png
              :alt: Ajouter une donnée
              :align: center

- par mot-clé :

.. image:: ../_images/user/mviewerstudio_2_thematiques_donnees1.png
              :alt: Chercher une donnée
              :align: center

- :guilabel:`mode avancé` en renseignant l'adresse du catalogue fournisseur ou d'un service WMS.

.. image:: ../_images/user/mviewerstudio_2_thematiques_donnees_avance.png
              :alt: Chercher une donnée
              :align: center

Ajouter une donnée depuis des paramètres
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Si le jeu de donnée n'est pas disponible dans un catalogue, il est possible de rajouter une donnée à l'aide des paramètres. Cliquez sur le second onglet et sélectionnez le type de la donnée parmi la liste (WMS, vector-TMS). Indiquez ensuite les paramètres en veillant à leur validité :

.. image:: ../_images/user/mviewerstudio_2_ajout_donnee_param.png
              :alt: Ajouter une donnée depuis des paramètres
              :align: center

* ``ID`` : paramètre de type texte qui renseigne l’identifiant technique de la couche côté serveur WMS ou WFS
* ``Nom`` : nom de la donnée dans l'application
* ``URL`` : paramètre de type URL (URL du service web)
* ``Lien vers le fichier de style`` : pour les couches de type vector-tms uniquement, il indique l’URL vers le fichier de style au format JSON.
* ``Nom du style`` : pour les couches de type vector-tms uniquement, titre à utiliser pour la liste des styles associés

Ajouter un groupe
-------------------------------------------

Le bouton |ajout_groupe| permet d'ajouter des données dans l'application. Il n'y a pas de limites du nombre de groupes par thématique.

.. image:: ../_images/user/mviewerstudio_2_ajout_groupe.png
              :alt: Groupe ajoutée
              :align: center


Il vous suffira de taper le nom du groupe. Le déplacement de données dans le groupe se fait via drag and drop.

.. |ajout_groupe| image:: ../_images/user/mviewerstudio_2_thematiques_bouton_ajouter_groupe.png
  :alt: Ajouter un groupe 
  :width: 100 pt


Paramétrer ses données
-------------------------------------------

Une fois cliqué sur Sélectionner, la donnée est ajoutée à l'arborescence. Vous pouvez modifier les paramétrages en cliquant sur |parametrage|.

.. image:: ../_images/user/mviewerstudio_2_ajout_donnee.png
              :alt: Donnée ajoutée
              :align: center

Onglet Général
~~~~~~~~~~~~~~~

L'onglet général recense les principales options de la donnée.

.. image:: ../_images/user/mviewerstudio_2_donnees_general.png
              :alt: Onglet Général
              :align: center

* ``Nom`` : nom de la donnée dans notre application.
* ``Attribution`` : source de la donnée.
* ``Opacité`` : opacité par défaut de la donnée.
* ``Afficher la donnée au démarrage de l'application`` : la donnée s'affiche au lancement de l'application.
* ``Afficher la donnée en première position de la carte`` : la donnée s'affiche toujours au-dessus des autres données qui n'ont pas activée cette option.
* ``Afficher le panneau de la couche déplié au démarrage`` : le pannneau d'affichage de la donnée sera déplié au démarrage. Il contient filtre, opacité, métadonnée...
* ``Styles disponibles`` : choix du·des style·s de la donnée dans notre application. Possibilité d'éditer le libellé du style.
* ``Libellé de la liste des styles`` : titre de la liste de sélection des styles.

Onglet Interrogation
~~~~~~~~~~~~~~~~~~~~~

L’onglet interrogation recense les options relatives à l’interrogation de la donnée. Concrètement ces options permettent de gérer l’affichage des informations supplémentaires d’une donnée lorsque l’on clique sur une entité sur la carte.

.. image:: ../_images/user/mviewerstudio_2_donnees_interrogation.png
              :alt: Onglet Interrogation - mode simple
              :align: center

* ``Activer l'interrogation de la donnée au clic sur la carte`` : active l'interrogation de la donnée.
* ``Position de la fiche d'information`` : affichage de la fiche d'information à droite ou en bas.
* ``Limitation du nombre de réponses`` :guilabel:`mode avancé`: limitation du nombre d'entités interrogées.
* ``Format de la fiche d'information`` : option permettant de choisir le format d’affichage de la fiche d’information.

        * ``Standard`` : affichage par défaut de la fiche d'information tel que défini par le serveur géographique
        * ``Personnalisé`` : affichage personnalisé de la fiche à l’aide d’un template

.. image:: ../_images/user/mviewerstudio_2_donnees_interrogation_advanced.png
              :alt: Onglet Interrogation - mode avancé
              :align: center

Pour personnaliser l’affichage de la fiche d’information, deux options sont possibles :

* ``Configurer une fiche d’information`` : créer une fiche personnalisée à l’aide du générateur de template (voir la rubrique « Configurer une fiche d’information" ci-dessous).
* ``Utiliser un template externe`` :guilabel:`mode avancé`: cette option permet d’activer l’utilisation d’un template externe en indiquant le lien vers un fichier .mst disponible en ligne.

.. warning:: L’activation de la fonctionnalité « Utiliser un template externe » prend le dessus sur le template construit à l’aide du générateur.

Onglet filtre
~~~~~~~~~~~~~~~~~~~~~~~

L'onglet filtre permet de filtrer les données à afficher sur la carte.

.. image:: ../_images/user/mviewerstudio_2_filtre_statique.png
              :alt: Filtre
              :align: center

* ``Filtre attributaire`` : Filtre selon un attribut. Utilisation d'un filtre cql_.
* ``Filtre géographique`` : Filtre selon la géométrie. Utilisation d'un filtre cql_.

.. _cql: https://docs.geoserver.org/stable/en/user/tutorials/cql/cql_tutorial.html#cql-tutorial



Onglet liste de choix
~~~~~~~~~~~~~~~~~~~~~~~~

L'onglet liste de choix permet de filtrer la donnée via une liste déroulante entre différentes valeurs. Disponible uniquement en :guilabel:`mode avancé`

.. image:: ../_images/user/mviewerstudio_2_donnees_filtre_dynamique.png
              :alt: Liste de choix
              :align: center

* :guilabel:`mode avancé` ``Nom du filtre`` : nom du filtre dans l'application.
* :guilabel:`mode avancé` ``Champs à filtrer`` : champ sur lequel le filtre va être effectué.
* :guilabel:`mode avancé` ``Valeur(s) sélectionnée(s)`` : valeurs disponibles dans le filtre.

Onglet options avancées
~~~~~~~~~~~~~~~~~~~~~~~~

L'onglet options avancées donne accès aux fonctionnalités avancées. Disponible uniquement en  :guilabel:`mode avancé`

.. image:: ../_images/user/mviewerstudio_2_donnees_avancees.png
              :alt: Options avancées
              :align: center

* :guilabel:`mode avancé` ``Index de couche`` : Position dans l'ordre d'affichage des données sur la carte et la légende au démarrage de l'application.
* :guilabel:`mode avancé` ``Echelle mini / maxi`` : Echelle minimale et maximale d'affichage de la donnée.
* :guilabel:`mode avancé` ``Affichage tuilé`` : Affichage tuilé de la donnée. La donnée est chargée progressivement.
* :guilabel:`mode avancé` ``Affichage exclusive de la données`` : L’affichage de cette couche masquera automatiquement toutes les autres couches ayant ce paramètre activé.
* :guilabel:`mode avancé` ``Ne pas afficher la donnée dans la légende`` : Permet de rendre la couche seulement visible sur la carte et invisible dans les thématiques et la légende.
* :guilabel:`mode avancé` ``Utiliser un style externe`` : Lien vers un style SLD remplaçant le style du serveur cartographique.
* :guilabel:`mode avancé` ``Type de légende`` : Possibilité de mettre une légende personnalisée vers un fichier image (via une URL).
* :guilabel:`mode avancé` ``Lien vers une légende personnalisée`` : URL vers un fichier afin d'afficher la légende à partir d'une image.
* :guilabel:`mode avancé` ``Adapter la légende selon le zoom de la carte`` : Précise si la légende est liée à l’échelle de la carte et si elle nécessite d’être actualisée à chaque changement d’échelle de la carte.
* :guilabel:`mode avancé` ``Métadonnées`` : Lien vers la métadonnée. Ne pas modifier.
* :guilabel:`mode avancé` ``Type de donnée`` : Lien vers la donnée. Ne pas modifier.
* :guilabel:`mode avancé` ``Métadonnées`` : Lien vers la métadonnée. Ne pas modifier.


Onglet recherche
~~~~~~~~~~~~~~~~~

L'onglet recherche permet d'activer la recherche dans l'application sur cette donnée. Cela nécessite un moteur de recherche elasticsearch pour une donnée WMS ou une donnée vectorielle type geojson pour le mode fuse. Disponible uniquement en :guilabel:`mode avancé`

.. image:: ../_images/user/mviewerstudio_2_donnees_recherche.png
              :alt: Filtre dynamique
              :align: center


Paramétrer une fiche d’information
-------------------------------------------

Depuis le mviewer studio, il est possible de personnaliser l’affichage d’une fiche d’information pour une donnée identifiée en sélectionnant les champs visibles pour l’utilisateur et leurs formes.

Créer une fiche d’information personnalisée
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Depuis les paramètres de la donnée, sélectionnez l’onglet « Interrogation » et le type de format ``Personnalisé`` dans la liste :

.. image:: ../_images/user/mviewerstudio_2_templateCustom_create.png
              :alt: Créer un template personnalisé
              :align: center

Puis à la rubrique « Configurer la fiche d’information », cliquez sur le bouton « + Créer ».

.. note:: 
  La position de la fiche d’information souhaitée doit préalablement être sélectionnée. Elle conditionne ensuite l’affichage des composants au sein du générateur.

Interface du générateur de template
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. image:: ../_images/user/mviewerstudio_2_templateCustom_ihm.png
              :alt: Fenêtre du générateur de template
              :align: center

Une nouvelle fenêtre s’ouvre. Cette fenêtre est divisée en deux, un bloc à gauche permettant de configurer la fiche d’information et ses composants, un bloc à droite permettant de prévisualiser la fiche configurée. On retrouvera cette configuration pour une fiche positionnée en bas mais avec un alignement vertical. 
On visualise également le nom du jeu de donnée pour lequel on configure la fiche d’information et la position de la fiche en haut de la fenêtre. 

.. note:: 
  La prévisualisation est basée sur la première entité retournée du jeu de donnée. Si les champs du jeu de données ne sont pas renseignés correctement (valeur nulle), l’affichage peut être perturbé.

Ajouter des composants à la fiche d’information
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Il est maintenant nécessaire de peupler le bloc de gauche avec des composants en cliquant sur le bouton « Ajouter un composant ». Une nouvelle fenêtre s’ouvre avec une liste de composants disponibles et préformatés : 

.. image:: ../_images/user/mviewerstudio_2_templateCustom_componentsList.png
              :alt: Liste des composants du générateur
              :align: center

* ``Titre`` : composant permettant d’afficher un titre et nécessitant une valeur de type texte en entrée.
* ``Sous-titre`` : composant permettant d’afficher  un sous-titre et nécessitant une valeur de type texte en entrée.
* ``Iframe`` : composant permettant d’afficher une fenêtre externe / widget nécessitant une valeur de type « url » en entrée.
* ``Image`` : composant permettant d’afficher une image nécessitant une valeur de type « url » en entrée.
* ``Bouton`` : composant permettant d’afficher un bouton avec une redirection vers une ressource externe en ligne et nécessitant une valeur de type « url » en entrée.
* ``Chiffre clé`` : composant permettant d’afficher un chiffre clé à mettre en avant et nécessitant une valeur de type « nombre » en entrée.
* ``Liste`` : composant permettant d’afficher une liste et nécessitant un champ composé d’une liste comme indiqué dans la `documentation mviewer <https://mviewerdoc.readthedocs.io/fr/latest/doc_tech/config_tpl.html#iterer-sur-un-champ-de-type-json>`_.
* ``Texte`` : composant permettant d’afficher un texte et nécessitant une valeur de type texte en entrée.
* ``Saisie libre`` : composant permettant de saisir librement le contenu du template comme dans un fichier Mustache (.mst).

Sélectionnez un composant et cliquez sur "Enregistrer" pour l’ajouter. Il n’est possible d’ajouter qu’un composant à la fois, veuillez réitérer l’opération pour ajouter des composants supplémentaires. 

.. note:: 
  Dans le cas d’une configuration pour la fiche d’information positionnée en bas, le nombre de composants est limité à 6, répartis sur 2 colonnes afin d’optimiser l’affichage. Pour aller plus loin, il est nécessaire de créer manuellement un template .mst et de l’importer en tant que template externe en s’aidant des modèles disponibles sur la page des démonstrations mviewer.

Configurer les composants
~~~~~~~~~~~~~~~~~~~~~~~~~~
Une fois les composants ajoutés, il est nécessaire de configurer chaque composant en définissant les informations à afficher et les options associées. 

.. image:: ../_images/user/mviewerstudio_2_templateCustom_componentsAdd.png
              :alt: Liste des composants du générateur
              :align: center

**Synthèse des options**

.. list-table:: Title
   :widths: 25 25 25 25 25 25 25 25
   :header-rows: 1

   * - Composant
     - Valeur à partir d'un champ
     - Valeur à partir de plusieurs champs
     - Valeur à partir d’une saisie libre
     - Couleur
     - Icône
     - Label
     - Style CSS
   * - Titre
     - x
     - x
     - x
     - x
     -
     -
     -
   * - Sous-titre
     - x
     - x
     - x
     - x
     -
     -
     -
   * - Texte
     - x
     - x
     - x
     -
     -
     -
     -
   * - Image
     - x
     - 
     - x
     -
     -
     -
     -
   * - Bouton
     - x
     - 
     - x
     - x
     - x
     - x
     - 
   * - Liste
     - x
     - 
     - x
     -
     -
     -
     - 
   * - Iframe
     - x
     -
     - x
     -
     -
     -
     - x
   * - Chiffre clé
     - x
     - x
     - x
     - x
     - x
     - x
     -
   * - Saisie libre
     -
     -
     - x
     -
     -
     -
     - x


**Valeur**

Dans le bloc du composant, veuillez sélectionner la source de l’information à afficher parmi la liste « Choisir un type » : 

- *A partir d’un champ :*

La valeur est définie dans un champ du jeu de donnée. Il faut ensuite sélectionner le champ à afficher dans la seconde liste.

.. image:: ../_images/user/mviewerstudio_2_templateCustom_componentValue1.png
              :alt: Configurer un template - Valeur selon un champs
              :align: center

- *A partir de plusieurs champs :*

La valeur est une concaténation de plusieurs champs au sein du jeu de données ainsi que de valeurs saisies librement. 
Il faut saisir les champs dans le deuxième bloc en tapant le nom du champ puis en sélectionnant le champ dans la liste d’auto-complétion. Validez le champ à ajouter à l’aide de touche « Entrer ». Vous pouvez également ajouter du texte fixe en saisissant les caractères et validez avec la touche « Entrer ».

.. image:: ../_images/user/mviewerstudio_2_templateCustom_componentValue2.png
              :alt: Configurer un template - Valeur selon plusieurs champs
              :align: center

- *Saisie libre :*

La valeur est une saisie de texte libre réalisée par l’utilisateur. Le texte saisie est statique, il sera affiché pour l’ensemble des entités du jeu de donnée. 

.. image:: ../_images/user/mviewerstudio_2_templateCustom_componentValue3.png
              :alt: Configurer un template - Valeur saisie libre
              :align: center

Pour une utilisation avancée, il est possible d’utiliser la syntaxe Mustache dans le bloc de saisie à l’aide des ``{{nom_du_champ}}`` ainsi que certaines balises .html comme le retour à la ligne ``</br>`` :

.. image:: ../_images/user/mviewerstudio_2_templateCustom_componentValue4.png
              :alt: Configurer un template - Valeur saisie libre mst
              :align: center

::

        Réserve naturelle de Bretagne </br> {{nom}}

Veuillez vous reporter à la documentation mviewer pour en savoir plus sur la `rédaction d’un template avec Mustache <https://mviewerdoc.readthedocs.io/fr/latest/doc_tech/config_tpl.html>`_.

**Couleur**

Pour certains composants, il est possible de personnaliser la couleur du texte et du fond. Cliquez sur le carré coloré et sélectionnez la couleur souhaitée dans la palette ou en saisissez une valeur RGB, HSL ou HEX. 

.. image:: ../_images/user/mviewerstudio_2_templateCustom_componentColor.png
              :alt: Configurer un template - Couleur
              :align: center

**Icône**

Pour certains composants, il est possible d’associer un icône. L’icône est issu de la librairie font-awesome. Pour ajouter un icône, cliquez sur le bouton « Choisir » et sélectionnez votre icône dans la librairie. 

**Label**

Pour certains composants, il est possible d’associer une description. Dans le champ de saisie associé, indiquez le texte souhaité pour la description du chiffre clé ou le label du bouton par exemple.


Prévisualiser votre fiche d’information
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lors de la configuration de la fiche d’information, il est possible de prévisualiser le résultat à tout moment en cliquant sur le bouton « Prévisualiser » en haut à droite :

.. image:: ../_images/user/mviewerstudio_2_templateCustom_preview.png
              :alt: Configurer un template - Prévisualisation
              :align: center

*Pour rappel, la prévisualisation est basée sur une la première entité du jeu de donnée. L’affichage peut être perturbé si les champs du jeu de données ne sont pas renseignés correctement (valeur nulle).*


Gérer les composants
~~~~~~~~~~~~~~~~~~~~

**Déplacer**

Il est possible de modifier l’ordre d’affichage des composants via un glisser/déposer. Positionnez la souris sur le titre ou l’icône du composant et déplacez le bloc à l’emplacement souhaité.

**Supprimer**

Pour supprimer un composant, cliquez sur l’icône |deleteComponent_template| en haut à droite du bloc. 

.. |deleteComponent_template| image:: ../_images/user/mviewerstudio_2_templateCustom_deleteComponent_btn.png
              :alt: Supprimer un composant
	            :width: 100 pt


Enregistrer la fiche d'information
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Lorsque la configuration est terminée, cliquez sur le bouton « Enregistrer » en bas de la fenêtre pour enregistrer la fiche d’information. 


Gérer une fiche d’information
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. image:: ../_images/user/mviewerstudio_2_templateCustom_manageOptions.png
              :alt: Gérer son template
              :align: center

**Editer**

Il est possible à tout moment de modifier la fiche d’information. Après avoir ouvert l’onglet « Interrogation » dans les paramètres de la donnée, cliquez sur l’icone |edit_template| pour éditer la fiche à l’aide du générateur.

.. |edit_template| image:: ../_images/user/mviewerstudio_2_templateCustom_manageOptions_edit.png
              :alt: Editer le template
	            :width: 100 pt

**Supprimer**

Pour supprimer définitivement la fiche d’information personnalisée, cliquez sur l’icône |delete_template|.  

.. |delete_template| image:: ../_images/user/mviewerstudio_2_templateCustom_manageOptions_delete.png
              :alt: Supprimer le template
	            :width: 100 pt

**Modifier la position**

Si vous modifiez la position de la fiche d’information après avoir configuré un template, il est préférable de vérifier l’affichage des composants et d’ajuster la disposition si nécessaire. 


.. |icone| image:: ../_images/user/mviewerstudio_2_icone.png
              :alt: Icône 
	      :width: 20 pt


.. |deplacement| image:: ../_images/user/mviewerstudio_2_deplacement.png
              :alt: Déplacer 
	      :width: 20 pt

.. |suppression| image:: ../_images/user/mviewerstudio_2_suppression.png
              :alt: Supprimer 
	      :width: 20 pt

Représentation cluster dans l’éditeur de style
--------------------------------------------

Pour une géométrie ponctuelle, la représentation ``cluster`` regroupe les points proches dans l’aperçu et dans le style exporté.
La distance saisie dans l’éditeur est exprimée en pixels et devient le paramètre ``cellSize`` de la transformation ``vec:PointStacker``.
Cette transformation est écrite dans le ``FeatureTypeStyle`` du SLD, avant les règles de symbolisation, en SLD 1.0.0 comme en SLD 1.1.0.
Les couleurs, contours et tailles des symboles configurés sont conservés.
Dans le tableau des règles, le composant ``ClusterRule`` remplace les classes de valeurs par une condition sur l’effectif ``count`` :

* tous les points et groupes, sans filtre d’effectif ;
* un point isolé, avec ``count = 1`` ;
* un groupe de plusieurs points, avec ``count > 1`` ;
* un intervalle d’effectifs, avec des bornes entières positives et inclusives.

Les colonnes « Effectif min » et « Effectif max » apparaissent uniquement lorsqu’au moins une règle cluster utilise la condition « Intervalle d’effectif » ; les bornes sont modifiables pour les règles utilisant cette condition.
Ces conditions sont appliquées dans l’aperçu, exportées comme filtres SLD et restaurées à la réouverture du style.
Les autres représentations conservent leur contenu : symbole uniforme, valeur de catégorie ou bornes de classes selon le mode choisi.
Si les étiquettes sont activées, elles affichent ``count`` pour les groupes (``count > 1``) et le champ choisi dans le formulaire pour les points isolés (``count = 1``).
Sur les sources cluster OpenLayers, les attributs du point isolé sont conservés pour permettre cette lecture.

La sauvegarde conserve la transformation dans le fichier SLD et ses paramètres dans le fichier JSON associé.
La réouverture du SLD généré restaure la représentation cluster et sa distance de regroupement.
Sur une couche vectorielle, mviewer lit la transformation pour créer une source cluster ; sur une couche WMS, le serveur doit prendre en charge PointStacker.
Le regroupement OpenLayers utilise une distance et peut différer de la grille calculée par GeoServer.

Choix de la couche du référentiel
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Dans ``config.json``, ``grist.grist_referentials`` associe ``layer_name`` à la couche du référentiel et ``centroide_layer_name`` à son support ponctuel optionnel.
Lorsque les deux couches sont configurées, les représentations polygonales utilisent ``layer_name`` et les représentations ponctuelles, dont ``cluster``, utilisent ``centroide_layer_name``.
Ce choix s’applique à l’aperçu, à la préparation des géométries CSV/Grist et au nom technique de la couche WMS dans le SLD exporté.
La sélection est conservée à la réouverture du style.
Un référentiel polygonal sans ``centroide_layer_name`` conserve uniquement ses représentations polygonales ; une couche nativement ponctuelle peut utiliser le mode cluster directement.

Échelles de visibilité par règle
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Cliquez sur le symbole d’une règle pour ouvrir la fenêtre « Personnalisation du style ».
La section « Échelles de visibilité », ouverte en haut de cette fenêtre, propose un dénominateur minimal et un dénominateur maximal pour chaque règle graphique SLD, pour toutes les représentations, y compris les clusters.
Ces champs sont indépendants des paramètres d’échelle des étiquettes.
Saisissez uniquement le dénominateur N de l’échelle 1:N, par exemple ``5000`` pour 1:5 000.
Un champ vide laisse la borne correspondante sans limite.
Le minimum est inclus et le maximum est exclu ; le maximum doit être strictement supérieur au minimum.
Ces paramètres sont appliqués dans l’aperçu, exportés dans les éléments SLD ``MinScaleDenominator`` et ``MaxScaleDenominator``, puis restaurés à la réouverture du style.
Pour les cercles proportionnels colorés, chaque combinaison de taille et de couleur utilise l’intersection de leurs plages d’échelles.

Classes d’effectifs des clusters
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Les paramètres de la représentation cluster regroupent la distance, l’intervalle de classe, le nombre de classes et le choix d’une palette avec inversion facultative.
Le bouton « Calculer » crée des règles sur ``count`` sans lire un champ du CSV ni interroger le WFS.
Par exemple, un intervalle de ``10`` et ``5`` classes créent les plages inclusives ``1–10``, ``11–20``, ``21–30``, ``31–40`` et ``41–50``, avec une couleur de la palette pour chaque règle.
Le calcul ajoute une dernière règle sans borne supérieure : avec une dernière classe finissant à ``50``, la règle « 51 ou plus » couvre tous les effectifs restants sans chevauchement.
Chaque plage et chaque symbole restent modifiables dans le tableau des règles.
Ces paramètres sont conservés dans la configuration du style ; le SLD contient les filtres d’effectifs et les couleurs correspondants.

Conservation du style sauvegardé
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

À la sauvegarde d’un style personnalisé, le front envoie le SLD puis le JSON associé avec le même identifiant.
Après l’enregistrement du JSON, si le SLD correspondant existe, le répertoire ``styles`` de l’application conserve uniquement cette paire ; les autres fichiers ``.sld`` et ``.json`` sont supprimés.
Le nettoyage concerne l’ensemble du répertoire de styles de cette application, et non seulement les styles d’une couche.
Si l’envoi du JSON échoue ou si le SLD correspondant est absent, les anciens styles sont conservés.

Taille initiale des classes de clusters
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Le calcul des classes propose un rayon par défaut compris entre 10 et 40 pixels selon la formule ``rayon = 10 + sqrt(ratio) × (40 − 10)``.
Les milieux des intervalles sont normalisés entre 0 pour la première classe et 1 pour la dernière afin d’utiliser toute la plage de tailles ; une classe de groupes unique conserve un rayon de 10 pixels.
Cette formule utilise les effectifs ``count`` des classes ; elle ne somme pas un attribut des points sources.
Chaque classe reçoit une taille fixe, utilisée dans l’aperçu et exportée dans le SLD ; cette taille reste modifiable dans la personnalisation du symbole.

Le calcul ajoute une règle dédiée aux points isolés (``count = 1``), avec un rayon de 5 pixels modifiable dans la personnalisation du symbole.
Les intervalles de groupes commencent à ``2`` pour éviter de superposer cette règle aux points isolés ; les autres bornes sont conservées.
La règle des points isolés s’ajoute aux classes demandées, sauf si un intervalle contient uniquement l’effectif ``1``, auquel cas cette règle le remplace.

Dans les paramètres d’étiquettes d’une représentation cluster, l’option « Afficher l’effectif des groupes (count) » permet de masquer ou d’afficher le nombre de points des groupes.
Désactiver cette option conserve les étiquettes du champ choisi pour les points isolés.
L’option est conservée à la sauvegarde et à la réouverture du style.

Pour une règle « 50 ou plus », choisissez la condition « Effectif supérieur ou égal à » puis saisissez ``50`` dans la colonne « Effectif min ».
Aucune borne maximale n’est appliquée : le filtre SLD généré est ``count >= 50``.
Ce seuil est conservé à la sauvegarde et à la réouverture du style ; les autres intervalles doivent s’arrêter à ``49`` pour éviter une superposition à partir de ``50``.

À chaque clic sur « Calculer », les règles sont régénérées avec une règle finale « borne maximale + 1 ou plus », dotée de la plus grande taille par défaut et de la dernière couleur de la palette.
Cette règle complète les intervalles inclusifs et la règle des points isolés, sans s’accumuler au fil des calculs.

La représentation cluster est limitée à 7 règles graphiques au total, règle des points isolés et règle finale « ou plus » comprises.
Le calcul accepte donc au maximum 5 classes d’effectifs ; l’ajout et la duplication sont désactivés à partir de 7 règles.
Les règles d’étiquettes ne sont pas comptées dans cette limite.

L’affichage du ``count`` des groupes est indépendant du niveau d’échelle choisi pour les étiquettes et reste contrôlé par l’option « Afficher l’effectif des groupes (count) ».
Les niveaux Région, Département, Commune et Rue limitent uniquement l’affichage du champ choisi pour les points isolés.

Dans les étiquettes des clusters, « Uniquement le nombre d’entités : Oui » affiche seulement le ``count`` des groupes, indépendamment de l’échelle, sans étiquette sur les points isolés.
Le choix « Non » permet de sélectionner un champ pour les points isolés et de choisir séparément si le nombre d’entités des groupes doit être affiché.
Le champ et le niveau d’affichage sont masqués lorsque seul le nombre d’entités est demandé.
