.. _configuration_styler:

Configurer le Styler
====================

Configuration frontend : ``app_conf`` dans ``src/static/config.json``.
Guides utilisateur : :ref:`styler_utilisation` et :doc:`../doc_user/grist`. Connexion et proxys : :doc:`proxy`.

Référentiels Grist
------------------

Emplacement : ``app_conf.grist.grist_referentials``. Noms de colonnes sensibles à la casse, sans traitement spécifique par référentiel.

.. list-table:: Paramètres
   :header-rows: 1
   :widths: 35 65

   * - Paramètre
     - Rôle
   * - ``label``
     - Libellé du sélecteur.
   * - ``layer_url``, ``layer_name``
     - Service WFS et couche avec espace de noms.
   * - ``join_field``
     - Champ WFS comparé au champ Grist sélectionné.
   * - ``srs``
     - Projection demandée au WFS et transmise au CSV.
   * - ``geometry_field_name``
     - Colonne géométrique de sortie dans Grist.
   * - ``x_field_name``, ``y_field_name``
     - Colonnes de coordonnées ; activent ensemble la sortie X/Y, pour une géométrie Point.
   * - ``centroide_layer_name``
     - Couche WFS optionnelle de centroïdes.
   * - ``centroid_field_name``
     - Colonne géométrique Grist du support de centroïdes.

Exemple : polygones avec support de centroïdes.

.. code-block:: json

   {
     "label": "Communes",
     "layer_url": "https://sig.example.org/geoserver/GCS",
     "layer_name": "GCS:CONTOURS_COMMUNE_IDF",
     "join_field": "CODE_INSEE",
     "srs": "EPSG:2154",
     "geometry_field_name": "GEOMETRY",
     "centroide_layer_name": "GCS:CENTROIDES_COMMUNE_IDF",
     "centroid_field_name": "geometry_centroid"
   }

Exemple : points avec sortie X/Y.

.. code-block:: json

   {
     "label": "Structures",
     "layer_url": "https://sig.example.org/geoserver/GCS",
     "layer_name": "GCS:STRUCTURES",
     "join_field": "CODE_STRUCTURE",
     "srs": "EPSG:2154",
     "x_field_name": "abscisse",
     "y_field_name": "ordonnee"
   }

Règles de configuration
~~~~~~~~~~~~~~~~~~~~~~~

* Sortie GeoJSON ponctuelle : retirer X/Y et renseigner ``geometry_field_name``.
* Aucun nom de colonne par défaut ; configuration incomplète ou noms X/Y identiques : erreur avant lecture Grist.
* La clé GeoJSON ``geometry`` ne désigne pas une colonne Grist. Le champ WFS est décrit par ``DescribeFeatureType`` ;
  ``geometry_field_name`` définit le nom de sortie dans Grist.
* Les centroïdes partagent ``layer_url``, ``join_field`` et ``srs`` avec le support principal.
* Sans ``centroide_layer_name``, aucun centroïde proposé ou calculé automatiquement.

Colonnes et XML
---------------

Les identifiants réels attribués par Grist priment sur les noms demandés ; un champ déjà enregistré dans la couche ou son XML reste prioritaire lors de la préparation du style.

.. list-table:: Correspondance backend / XML
   :header-rows: 1
   :widths: 40 60

   * - Réponse de jointure
     - Attribut XML
   * - ``geometry_field``
     - ``geojsonField`` et ``gristGeometryField`` pour GeoJSON.
   * - ``centroid_field``
     - ``gristCentroidField`` après écriture du support.
   * - ``x_field``, ``y_field``
     - ``xfield``, ``yfield``.

Extraits de localisation, à compléter avec l’identifiant, le nom et l’URL CSV :

.. code-block:: xml

   <layer type="csv" geojsonField="GEOMETRY2" gristGeometryField="GEOMETRY2"
          gristReferential="GCS:CONTOURS_COMMUNE_IDF"
          gristMatchingField="code_commune" srs="EPSG:2154" />

   <layer type="csv" xfield="abscisse" yfield="ordonnee"
          gristReferential="GCS:STRUCTURES"
          gristMatchingField="code_structure" srs="EPSG:2154" />

WKT : proposé pour l’écriture dans Grist ; les exemples XML et aperçus ci-dessus concernent GeoJSON ou X/Y.

Prévisualisation
----------------

* Frontend : ``DATA_PREVIEW_LIMIT = 100`` dans ``js/components/StyleEditor/constants.js`` ; échantillon de la carte et ``MAXFEATURES`` du WFS ``GetFeature``.
* Backend : ``REFERENTIAL_PREVIEW_LIMIT = 100`` dans ``utils/grist_join.py`` ; limite des valeurs de jointure de ``api/grist/refgeo/preview``.
* Maintenir les deux limites cohérentes ; le nombre de résultats d’interrogation de l’application publiée reste indépendant.
* Aperçu en lecture seule ; géométrie Grist manquante complétée à la sauvegarde si nécessaire.

Stockage et lecture des SLD
---------------------------

.. code-block:: json

   {
     "mviewer_instance": "https://sig.example.org/mviewer/",
     "conf_path_from_mviewer": "apps/store/"
   }

* URL publique : ``mviewer_instance`` + ``conf_path_from_mviewer``.
* Stockage disque : ``EXPORT_CONF_FOLDER/<publisher>/<id>/styles`` ; doit correspondre au stockage exposé par mviewer.
* Lecture Studio : ``api/styles/<id>?filename=<nom>.sld``, avec contrôle de l’organisation propriétaire.
* Backend 404 : repli vers l’URL complète mviewer, via ``app_conf.proxy`` si configuré.
* Backend 401, 403 ou 500 : erreur sans repli.
* SLD externe : URL résolue depuis mviewer, proxy général pour une origine distante si configuré.
* Échec de lecture ou réponse HTML : bandeau persistant et bouton « Réinitialiser le style ».
  Le style vierge remplace le style enregistré uniquement à la sauvegarde ; restaurer le SLD pour conserver l’ancien.

.. note::

   Sauvegarde : SLD puis JSON avec le même identifiant. Après succès du JSON, seule cette paire est conservée
   dans le dossier ``styles`` de la carte, toutes couches confondues.
   Un XML référençant un ancien fichier supprimé ne peut plus le charger, même avec le repli mviewer.
