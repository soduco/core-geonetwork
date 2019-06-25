/*
 * Copyright (C) 2001-2016 Food and Agriculture Organization of the
 * United Nations (FAO-UN), United Nations World Food Programme (WFP)
 * and United Nations Environment Programme (UNEP)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301, USA
 *
 * Contact: Jeroen Ticheler - FAO - Viale delle Terme di Caracalla 2,
 * Rome - Italy. email: geonetwork@osgeo.org
 */

(function() {
  goog.provide('gn_catalog_service');

  goog.require('gn_urlutils_service');

  var module = angular.module('gn_catalog_service', [
    'gn_urlutils_service'
  ]);

  /**
   * @ngdoc service
   * @kind function
   * @name gnMetadataManager
   * @requires $http
   * @requires $location
   * @requires $timeout
   * @requires gnUrlUtils
   *
   * @description
   * The `gnMetadataManager` service provides main operations to manage
   * metadatas such as create, import, copy or delete.
   * Other operations like save are provided by another service `gnEditor`.
   */
  module.factory('gnMetadataManager', [
    '$http',
    '$location',
    '$timeout',
    'gnUrlUtils',
    'Metadata',
    function($http, $location, $timeout, gnUrlUtils, Metadata) {
      return {
        //TODO: rewrite calls with gnHttp

        /**
           * @ngdoc method
           * @name gnMetadataManager#remove
           * @methodOf gnMetadataManager
           *
           * @description
           * Delete a metadata from catalog
           *
           * @param {string} id Internal id of the metadata
           * @return {HttpPromise} Future object
           */
        remove: function(id) {
          return $http.delete('../api/records/' + id);
        },

        /**
         * @ngdoc method
         * @name gnMetadataManager#validate
         * @methodOf gnMetadataManager
         *
         * @description
         * Validate a metadata from catalog
         *
         * @param {string} id Internal id of the metadata
         * @return {HttpPromise} Future object
         */
        validate: function(id) {
          return $http.put('../api/records/' + id + '/validate/internal');
        },

        /**
         * @ngdoc method
         * @name gnMetadataManager#validateDirectoryEntry
         * @methodOf gnMetadataManager
         *
         * @description
         * Validate a directory entry (shared object) from catalog
         *
         * @param {string} id Internal id of the directory entry
         * @param {bool} newState true is validated, false is rejected
         * @return {HttpPromise} Future object
         */
        validateDirectoryEntry: function(id, newState) {
          var param = '?isvalid=' + (newState ? 'true' : 'false');
          return $http.put('../api/records/' + id + '/validate/internal' + param);
        },

        /**
           * @ngdoc method
           * @name gnMetadataManager#copy
           * @methodOf gnMetadataManager
           *
           * @description
           * Create a copy of a metadata. The copy will belong to the same group
           * of the original metadata and will be of the same type (isTemplate,
           * isChild, fullPrivileges).
           *
           * @param {string} id Internal id of the metadata to be copied.
           * @param {string} groupId Internal id of the group of the metadata
           * @param {boolean} withFullPrivileges privileges to assign.
           * @param {boolean|string} isTemplate type of the metadata (bool is
           *  for TEMPLATE, other values are SUB_TEMPLATE and
           *  TEMPLATE_OF_SUB_TEMPLATE)
           * @param {boolean} isChild is child of a parent metadata
           * @param {string} metadataUuid , the uuid of the metadata to create
           *                 (when metadata uuid is set to manual)
           * @param {boolean} hasCategoryOfSource copy categories from source
           * @return {HttpPromise} Future object
           */
        copy: function(id, groupId, withFullPrivileges,
            isTemplate, isChild, metadataUuid, hasCategoryOfSource) {
          // new md type determination
          var mdType;
          switch (isTemplate) {
            case 'TEMPLATE_OF_SUB_TEMPLATE':
              mdType = 'TEMPLATE_OF_SUB_TEMPLATE';
              break;

            case 'SUB_TEMPLATE':
              mdType = 'SUB_TEMPLATE';
              break;

            case 'TEMPLATE':
            case true:
              mdType = 'TEMPLATE';
              break;

            default: mdType = 'METADATA';
          }

          var url = gnUrlUtils.toKeyValue({
            metadataType: mdType,
            sourceUuid: id,
            isChildOfSource: isChild ? 'true' : 'false',
            group: groupId,
            isVisibleByAllGroupMembers: withFullPrivileges ? 'true' : 'false',
            targetUuid: metadataUuid || '',
            hasCategoryOfSource: hasCategoryOfSource ? 'true' : 'false'
          });
          return $http.put('../api/records/duplicate?' + url, {
            headers: {
              'Accept': 'application/json'
            }
          });
        },

        /**
         * @ngdoc method
         * @name gnMetadataManager#importFromXml
         * @methodOf gnMetadataManager
         *
         * @description
         * Import records from a xml string.
         *
         * @param {Object} data Params to send to md.insert service
         * @return {HttpPromise} Future object
         */
        importFromXml: function(urlParams, xml) {
          return $http.put('../api/records?' + urlParams, xml, {
            headers: {
              'Content-Type': 'application/xml'
            }
          });
        },

        /**
           * @ngdoc method
           * @name gnMetadataManager#create
           * @methodOf gnMetadataManager
           *
           * @description
           * Create a new metadata as a copy of an existing template.
           * Will forward to `copy` method.
           *
           * @param {string} id Internal id of the metadata to be copied.
           * @param {string} groupId Internal id of the group of the metadata
           * @param {boolean} withFullPrivileges privileges to assign.
           * @param {boolean} isTemplate type of the metadata
           * @param {boolean} isChild is child of a parent metadata
           * @param {string} tab is the metadata editor tab to open
           * @param {string} metadataUuid , the uuid of the metadata to create
           *                 (when metadata uuid is set to manual)
           * @param {boolean} hasCategoryOfSource copy categories from source
           * @return {HttpPromise} Future object
           */
        create: function(id, groupId, withFullPrivileges,
            isTemplate, isChild, tab, metadataUuid, hasCategoryOfSource) {

          return this.copy(id, groupId, withFullPrivileges,
              isTemplate, isChild, metadataUuid, hasCategoryOfSource)
              .success(function(id) {
                var path = '/metadata/' + id;
                if (tab) {
                  path += '/tab/' + tab;
                }
                $location.path(path)
                .search('justcreated')
                .search('redirectUrl', 'catalog.edit');
              });
        },

        /**
         * @ngdoc method
         * @name gnMetadataManager#getMdObjByUuid
         * @methodOf gnMetadataManager
         *
         * @description
         * Get the metadata js object from catalog. Trigger a search and
         * return a promise.
         * @param {string} uuid or id of the metadata
         * @param {array} isTemplate optional isTemplate value (y, n, s, t...)
         * @return {HttpPromise} of the $http post
         */
        getMdObjByUuid: function(uuid, isTemplate) {
          return $http.post('../api/search/records/_search', {"query": {
              "bool" : {
                "must": [
                  {"multi_match": {
                      "query": uuid,
                      "fields": ['id', 'uuid']}},
                  {"terms": {"isTemplate": isTemplate !== undefined ? isTemplate : ['n']}},
                  {"terms": {"draft": ["n", "y", "e"]}}
                ]
              }
            }}).then(function(r) {
              if (r.data.hits.total.value > 0) {
                return new Metadata(r.data.hits.hits[0]);
              } else {
                console.warn("Record with UUID/ID " + uuid + " not found.")
              }
              });
        },

        /**
         * @ngdoc method
         * @name gnMetadataManager#getMdObjById
         * @methodOf gnMetadataManager
         *
         * @description
         * Get the metadata js object from catalog. Trigger a search and
         * return a promise.
         * @param {string} id of the metadata
         * @param {array} isTemplate optional isTemplate value (y, n, s, t...)
         * @return {HttpPromise} of the $http post
         */
        getMdObjById: function(id, isTemplate) {
          return this.getMdObjByUuid(id, isTemplate);
        },

        /**
         * @ngdoc method
         * @name gnMetadataManager#updateMdObj
         * @methodOf gnMetadataManager
         *
         * @description
         * Update the metadata object
         *
         * @param {object} md to reload
         * @return {HttpPromise} of the $http get
         */
        updateMdObj: function(md) {
          return this.getMdObjByUuid(md.uuid).then(
              function(md_) {
                angular.extend(md, md_);
                return md;
              }
          );
        }
      };
    }
  ]);

  /**
   * @ngdoc service
   * @kind Object
   * @name gnHttpServices
   *
   * @description
   * The `gnHttpServices` service provides KVP for all geonetwork
   * services used in the UI.
   */

  module.value('gnHttpServices', {
    mdGetPDFSelection: 'pdf.selection.search', // TODO: CHANGE
    mdGetRDF: 'rdf.metadata.get',
    mdGetMEF: 'mef.export', // Deprecated service
    mdGetXML19139: 'xml_iso19139',
    csv: 'csv.search',

    publish: 'md.publish',
    unpublish: 'md.unpublish',

    processAll: 'md.processing.batch',
    processReport: 'md.processing.batch.report',
    processXml: 'xml.metadata.processing',

    suggest: 'suggest',

    search: 'q',
    internalSearch: 'qi',
    subtemplate: 'subtemplate',
    lang: 'lang?_content_type=json&',
    removeThumbnail: 'md.thumbnail.remove?_content_type=json&',
    removeOnlinesrc: 'resource.del.and.detach', // TODO: CHANGE
    suggest: 'suggest',
    facetConfig: 'search/facet/config',
    selectionLayers: 'selection.layers',

    featureindexproxy: '../../index/features',
    indexproxy: '../../index/records'
  });


  /**
   * @ngdoc service
   * @kind function
   * @name gnHttp
   * @requires $http
   * @requires gnHttpServices
   * @requires $location
   * @requires gnUrlUtils

   * @description
   * The `gnHttp` service extends `$http` service
   * for geonetwork usage. It is based on `gnHttpServices` to
   * get service url.
   */
  module.provider('gnHttp', function() {

    this.$get = ['$http', 'gnHttpServices' , '$location', 'gnUrlUtils',
      function($http, gnHttpServices, $location, gnUrlUtils) {

        var originUrl = this.originUrl = gnUrlUtils.urlResolve(
            window.location.href, true);

        var defaults = this.defaults = {
          host: originUrl.host,
          pathname: originUrl.pathname,
          protocol: originUrl.protocol
        };

        var urlSplit = originUrl.pathname.split('/');
        if (urlSplit.lenght < 3) {
          //TODO manage error
        }
        else {
          angular.extend(defaults, {
            webapp: urlSplit[1],
            srv: urlSplit[2],
            lang: urlSplit[3]
          });
        }
        return {

          /**
           * @ngdoc method
           * @name gnHttp#callService
           * @methodOf gnHttp
           *
           * @description
           * Calls a geonetwork service with given parameters
           * and an httpConfig
           * (that will be handled by `$http#get` method).
           *
           * @param {string} serviceKey key of the service to
           * get the url from `gnHttpServices`
           * @param {Object} params to add to the request
           * @param {Object} httpConfig see httpConfig of
           * $http#get method
           * @return {HttpPromise} Future object
           */
          callService: function(serviceKey, params, httpConfig) {

            var config = {
              url: gnHttpServices[serviceKey] || serviceKey,
              params: params,
              method: 'GET'
            };
            angular.extend(config, httpConfig);
            return $http(config);
          },

          /**
           * Return service url for a given key
           * @param {string} serviceKey
           * @return {*}
           */
          getService: function(serviceKey) {
            return gnHttpServices[serviceKey];
          }
        };
      }];
  });

  /**
   * @ngdoc service
   * @kind Object
   * @name gnConfig
   *
   * @description
   * The `gnConfig` service provides KVP for all geonetwork
   * configuration settings that can be managed
   * in administration UI.
   * The `key` Object contains shortcut to full settings path.
   * The value are set in the `gnConfig` object.
   *
   * @example
     <code>
      {
        key: {
          isXLinkEnabled: 'system.xlinkResolver.enable',
          isSelfRegisterEnabled: 'system.userSelfRegistration.enable',
          isFeedbackEnabled: 'system.userFeedback.enable',
          isInspireEnabled: 'system.inspireValidation.enable',
          isRatingUserFeedbackEnabled: 'system.localratinguserfeedback.enable',
          isSearchStatEnabled: 'system.searchStats.enable',
          isHideWithHelEnabled: 'system.hidewithheldelements.enable'
        },
        isXLinkEnabled: true,
        system.server.host: 'localhost'

      }
     </code>
   */
  module.value('gnConfig', {
    key: {
      isXLinkEnabled: 'system.xlinkResolver.enable',
      isXLinkLocal: 'system.xlinkResolver.localXlinkEnable',
      isSelfRegisterEnabled: 'system.userSelfRegistration.enable',
      isFeedbackEnabled: 'system.userFeedback.enable',
      isInspireEnabled: 'system.inspire.enable',
      isRatingUserFeedbackEnabled: 'system.localrating.enable',
      isSearchStatEnabled: 'system.searchStats.enable',
      isHideWithHelEnabled: 'system.hidewithheldelements.enable'
    },
    'map.is3DModeAllowed': window.location.search.indexOf('with3d') !== -1
  });

  /**
   * @ngdoc service
   * @kind function
   * @name gnConfigService
   * @requires $q
   * @requires gnHttp
   * @requires gnConfig
   *
   * @description
   * Load the catalog config and push it to gnConfig.
   */
  module.factory('gnConfigService', [
    '$http', '$q',
    'gnConfig',
    function($http, $q, gnConfig) {
      var defer = $q.defer();
      var loadPromise = defer.promise;
      return {

        /**
         * @ngdoc method
         * @name gnConfigService#load
         * @methodOf gnConfigService
         *
         * @description
         * Get catalog configuration. The config is cached.
         * Boolean value are parsed to boolean.
         *
         * @return {HttpPromise} Future object
         */
        load: function() {
          return $http.get('../api/site/settings', {cache: true})
              .then(function(response) {
                angular.extend(gnConfig, response.data);
                // Replace / by . in settings name
                angular.forEach(gnConfig, function(value, key) {
                  if (key.indexOf('/') !== -1) {
                    gnConfig[key.replace(/\//g, '.')] = value;
                    delete gnConfig[key];
                  }
                });
                // Override parameter if set in URL
                if (window.location.search.indexOf('with3d') !== -1) {
                  gnConfig['map.is3DModeAllowed'] = true;
                }
                defer.resolve(gnConfig);
              }, function() {
                defer.reject();
              });
        },
        loadPromise: loadPromise,

        /**
         * @ngdoc method
         * @name gnConfigService#getServiceURL
         * @methodOf gnConfigService
         *
         * @description
         * Get service URL from configuration settings.
         * It is used by `gnHttp`service.
         *
         * @return {String} service url.
         */
        getServiceURL: function() {
          var port = '';
          if (gnConfig['system.server.protocol'] === 'http' &&
             gnConfig['system.server.port'] &&
             gnConfig['system.server.port'] != null &&
             gnConfig['system.server.port'] != 80) {

            port = ':' + gnConfig['system.server.port'];

          } else if (gnConfig['system.server.protocol'] === 'https' &&
             gnConfig['system.server.securePort'] &&
             gnConfig['system.server.securePort'] != null &&
             gnConfig['system.server.securePort'] != 443) {

            port = ':' + gnConfig['system.server.securePort'];

          }

          var url = gnConfig['system.server.protocol'] + '://' +
              gnConfig['system.server.host'] + port +
              gnConfig.env.baseURL + '/' +
              gnConfig.env.node + '/';
          return url;
        }
      };
    }]);

  /**
   * @ngdoc service
   * @kind function
   * @name Metadata
   *
   * @description
   * The `Metadata` service is a metadata wrapper from the jeeves
   * json output of the search service. It also provides some functions
   * on the metadata.
   */
  module.factory('Metadata', ['gnLangs', function(gnLangs) {
    var langSuffix = "_lang";

    function Metadata(k) {
      // Move _source properties to the root.
      var source = k._source;
      delete k._source;
      $.extend(true, this, k, source);


      // TODOES Check if we can define in ES which fields
      // to always return as an array.
      var listOfArrayFields = ['topic', 'cat', 'keyword', 'resourceCredit',
        'resolutionScaleDenominator', 'resolutionDistance', 'extentDescription', 'geom',
        'inspireTheme', 'inspireTheme_syn', 'inspireAnnex',
        'status', 'status_text', 'coordinateSystem', 'identifier', 'responsibleParty',
        'mdLanguage', 'resourceLanguage', 'resourceIdentifier',
        'MD_LegalConstraintsOtherConstraints', 'MD_LegalConstraintsUseLimitation',
        'MD_SecurityConstraintsUseLimitation',
        'MD_ConstraintsUseLimitation',
        'type', 'link', 'crsDetails', 'format', 'otherLanguage',
        'creationDateForResource', 'publicationDateForResource', 'revisionDateForResource',
        'contact', 'contactForResource'];



      // Populate translation for all multilingual fields.
      // Multilingual fields are composed of one field without _lang suffix
      // and one field for each translation.
      // Set the default field value to the UI language if exist.
      var listOfTranslatedField = {};
      var record = this;
      $.each(this, function(key, value) {
        var fieldName = key.split(langSuffix)[0];
        if (key.indexOf(langSuffix) !== -1 &&
          angular.isUndefined(listOfTranslatedField[fieldName])) {
          record[fieldName] = record.translate(fieldName);
          listOfTranslatedField[fieldName] = true;
        }
      });


      // See below; probably not necessary
      this.linksCache = [];

      // Codelist as array
      $.each(this, function(key, value) {
        // All codelist are an array
        if (key.indexOf('codelist_') === 0 && !angular.isArray(record[key])) {
          record[key] = [record[key]];
        }
      });

      // Convert all fields declared as array
      // as an array even if only one value.
      $.each(listOfArrayFields, function(idx) {
        var field = listOfArrayFields[idx];
        if ((angular.isDefined(record[field])) &&
            !angular.isArray(record[field])) {
          record[field] = [record[field]];
        }
      });



      // TODOES This should be defined as object in ES
      var listOfJsonFields = ['crsDetails'];

      // Note: this step does not seem to be necessary; TODO: remove or refactor
      $.each(listOfJsonFields, function(idx) {
        var fieldName = listOfJsonFields[idx];
        if (angular.isDefined(record[fieldName])) {
          try {
            record[fieldName] = angular.fromJson(record[fieldName]);
            var field = record[fieldName];

            // Combine all document keywordGroup fields
            // in one object. Applies to multilingual records
            // which may have multiple values after combining
            // documents from all index
            // fixme: not sure how to precess this, take first array as main
            // object or take last arrays when they appear (what is done here)
            if (fieldName === 'keywordGroup' && angular.isArray(field)) {
              var thesaurusList = {};
              for (var i = 0; i < field.length; i++) {
                var thesauri = field[i];
                $.each(thesauri, function(key) {
                  if (!thesaurusList[key] && thesauri[key].length)
                    thesaurusList[key] = thesauri[key];
                });
              }
              record[fieldName] = thesaurusList;
            }
          } catch (e) {}
        }
      }.bind(this));

      this.getAllContacts();
      // Create a structure that reflects the transferOption/onlinesrc tree
      // var links = [];
      // angular.forEach(this.link, function(link) {
      //   var linkInfo = formatLink(link);
      //   var idx = linkInfo.group - 1;
      //   if (!links[idx]) {
      //     links[idx] = [linkInfo];
      //   }
      //   else if (angular.isArray(links[idx])) {
      //     links[idx].push(linkInfo);
      //   }
      // });
      // this.linksTree = links;
    };

    // function formatLink(sLink) {
    //   var linkInfos = sLink.split('|');
    //   return {
    //     name: linkInfos[0],
    //     title: linkInfos[0],
    //     url: linkInfos[2],
    //     desc: linkInfos[1],
    //     protocol: linkInfos[3],
    //     contentType: linkInfos[4],
    //     group: linkInfos[5] ? parseInt(linkInfos[5]) : undefined,
    //     applicationProfile: linkInfos[6]
    //   };
    // }

    Metadata.prototype = {
      translate: function(fieldName) {
        var translation = this[fieldName + '_lang' + gnLangs.current];

        if (translation) {
          return translation;
        } else if (this[fieldName]) {
          return this[fieldName];
        } else {
          console.warn(fieldName + ' is not defined in this record.');
        }
      },
      // getUuid: function() {
      //   return this.uuid || this._source.uuid;
      // },
      // getId: function() {
      //   return this.id;
      // },
      isPublished: function() {
        return this.isPublishedToAll === 'true';
      },
      isValid: function() {
        return this.valid === '1';
      },
      hasValidation: function() {
        return (this.valid > -1);
      },
      isOwned: function() {
        return this.owner === 'true';
      },
      getOwnerId: function() {
        return this.ownerId;
      },
      getGroupOwner: function() {
        return this.owner;
      },
      getSchema: function() {
        return this.schema;
      },
      publish: function() {
        this.isPublishedToAll = this.isPublished() ?
            'false' : 'true';
      },

      getLinks: function() {
        return this.link;
      },
      getLinkGroup: function(layer) {
        var links = this.getLinksByType('OGC');
        for (var i = 0; i < links.length; ++i) {
          var link = links[i];
          if (link.name == layer.getSource().getParams().LAYERS) {
            return link.group;
          }
        }
      },
      /**
       * Get all links of the metadata of the given types.
       * The types are strings in arguments.
       * You can give the exact matching with # ('#OG:WMS') or just find an
       * occurence for the match ('OGC').
       * You can passe several types to find ('OGC','WFS', '#getCapabilities')
       *
       * If the first argument is a number, you do the search within the link
       * group (search only onlinesrc in the given transferOptions).
       *
       * @return {*} an Array of links
       */
      getLinksByType: function() {
        var ret = [];

        var types = Array.prototype.splice.call(arguments, 0);
        var groupId;

        var key = types.join('|');
        if (angular.isNumber(types[0])) {
          groupId = types[0];
          types.splice(0, 1);
        }
        if (this.linksCache[key] && !groupId) {
          return this.linksCache[key];
        }
        angular.forEach(this.link, function(link) {
          if (types.length > 0) {
            types.forEach(function(type) {
              if (type.substr(0, 1) == '#') {
                if (link.protocol == type.substr(1, type.length - 1) &&
                    (!groupId || groupId == link.group)) {
                  ret.push(link);
                }
              }
              else {
                if (link.protocol.toLowerCase().indexOf(
                    type.toLowerCase()) >= 0 &&
                    (!groupId || groupId == link.group)) {
                  ret.push(link);
                }
              }
            });
          } else {
            ret.push(link);
          }
        });
        this.linksCache[key] = ret;
        return ret;
      },
      getThumbnails: function() {
        if (angular.isArray(this.image)) {
          var images = {list: []};
          for (var i = 0; i < this.image.length; i++) {
            var s = this.image[i].split('|');
            var insertFn = 'push';
            if (s[0] === 'thumbnail') {
              images.small = s[1];
              var insertFn = 'unshift';
            } else if (s[0] === 'overview') {
              images.big = s[1];
            }
            
            //Is it a draft?
            if( s[1].indexOf("/api/records/") >= 0 
                &&  s[1].indexOf("/api/records/")<  s[1].indexOf("/attachments/")) {
              s[1] += "?approved=" + (this.draft != 'y');
            }
              
            
            images.list[insertFn]({url: s[1], label: s[2]});
          }
        }
        return images;
      },
      /**
       * Return an object containing metadata contacts
       * as an array and resource contacts as array
       *
       * @return {{metadata: Array, resource: Array}}
       */
      getAllContacts: function() {
        this.allContacts = {metadata:[], resource:[]};
        if (this.contact && this.contact.length > 0){
          this.allContacts.metadata = this.contact;
        }
        if (this.contactForResource && this.contactForResource.length > 0){
          this.allContacts.resource = this.contactForResource;
        }
        return this.allContacts;
      },
      getOwnername: function() {
        if (this.userinfo) {
          var userinfo = this.userinfo.split('|');
          try {
            if (userinfo[2] !== userinfo[1]) {
              return userinfo[2] + ' ' + userinfo[1];
            } else {
              return userinfo[1];
            }
          } catch (e) {
            return '';
          }
        } else {
          return '';
        }
      },
      isWorkflowEnabled: function() {
        var st = this.mdStatus;
        var res = st &&
            //Status is unknown
            (!isNaN(st) && st != '0');

        //What if it is an array: gmd:MD_ProgressCode
        if (!res && Array.isArray(st)) {
          angular.forEach(st, function(s) {
            if (!isNaN(s) && s != '0') {
              res = true;
            }
          });
        }
        return res;
      }
    };
    return Metadata;
  }]);


})();
