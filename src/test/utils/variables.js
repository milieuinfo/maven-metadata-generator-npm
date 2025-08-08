

const context = {
    "collections": {
        "@type": "@id",
        "@reverse": "member"
    },
    "inscheme" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#inScheme",
        "@type" : "@id"
    },
    "id": "@id",
    "graph": "@graph",
    "type" : {
        "@id" : "@type",
        "@type" : "@id"
    },
    "prefLabel" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#prefLabel",
        "@language" : "nl"
    },
    "altLabel" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#altLabel",
        "@language" : "nl"
    },
    "member" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#member",
        "@type" : "@id"
    }
}

const context_parquet = {
    "collections": {
        "@type": "@id",
        "@reverse": "member"
    },
    "inscheme" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#inScheme",
        "@type" : "@id"
    },
    "id": "@id",
    "graph": "@graph",
    "type" : {
        "@id" : "@type",
        "@type" : "@id",
        "@container": "@set"
    },
    "prefLabel" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#prefLabel",
        "@language" : "nl"
    },
    "altLabel" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#altLabel",
        "@language" : "nl"
    },
    "member" : {
        "@id" : "http://www.w3.org/2004/02/skos/core#member",
        "@type" : "@id",
        "@container": "@set"
    },
    "nummer" : {
        "@id" : "http://example.com#nummer",
        "@type" : "http://www.w3.org/2001/XMLSchema#decimal"
    },
    "waar" : {
        "@id" : "http://example.com#waar",
        "@type" : "http://www.w3.org/2001/XMLSchema#boolean"
    },
    "nietwaar" : {
        "@id" : "http://example.com#nietwaar",
        "@type" : "http://www.w3.org/2001/XMLSchema#boolean"
    },
    "identifier" : {
        "@id" : "http://purl.org/dc/elements/1.1/identifier"
    }
}

const succes_frame_parquet = {
    "@context": context_parquet,
    "@type": ["http://www.w3.org/2004/02/skos/core#Collection", "http://www.w3.org/2004/02/skos/core#Concept",  "http://www.w3.org/2004/02/skos/core#ConceptScheme"],
    "member": {
        "@embed": "@never",
        "@omitDefault": true
    },
    "inscheme": {
        "@embed": "@never",
        "@omitDefault": true
    }

}

const succes_frame = {
    "@context": context,
    "@type": ["http://www.w3.org/2004/02/skos/core#Collection", "http://www.w3.org/2004/02/skos/core#Concept"],
    "member": {
        "@type": "http://www.w3.org/2004/02/skos/core#Concept",
        "@embed": "@never",
        "@omitDefault": true
    },
    "inscheme": {
        "@type": "http://www.w3.org/2004/02/skos/core#ConceptScheme",
        "@embed": "@never",
        "@omitDefault": true
    }

}

const fail_frame = {
    "@context": context,
    "@type": ["http://www.w3.org/2004/02/skos/core#Collection", "http://www.w3.org/2004/02/skos/core#Concept"]
}

const fail_frame_2 = {
    "@context": context,
    "@type": "http://www.w3.org/2004/02/skos/core#ConceptScheme",
}

const json_ld_error = {
    "@context": {
        "collections": {
            "@type": "@id",
            "@reverse": "member"
        },
        "id": "@id",
        "type" : {
            "@id" : "@type",
            "@type" : "@id"
        },
        "prefLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#prefLabel",
            "@language" : "nl"
        },
        "altLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#altLabel",
            "@language" : "nl"
        },
        "member" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#member",
            "@type" : "@id"
        },
        "identifier": {
            "@id": "http://purl.org/dc/elements/1.1/identifier"
        },
        "inscheme" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#inScheme",
            "@type" : "@id"
        },
        "conceptscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/",
        "collectie": "https://data.omgeving.vlaanderen.be/id/collection/gebouw/",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "@base": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/"
    },
    "@graph": [
        {
            "id": "conceptscheme:gebouw",
            "type": "skos:ConceptScheme",
            "prefLabel": "Codelijst bouw",
        },
        {
            "id": "collectie:verwaarlozing",
            "type": "skos:Collection",
            "member": [
                "schoorsteen",
                "buitenmuur",
            ],
            "altLabel": "co_verwaarlozing",
            "prefLabel": "Collectie van concepten die gebruikt worden binnen de applicatie verwaarlozing en leegstand."
        },
        {
            "id": "buitenmuur",
            "type": "skos:Concept",
            "altLabel": "buiten muur",
            "prefLabel": "buitenmuur"
        },
        {
            "id": "schoorsteen",
            "type": "skos:Concept",
            "altLabel": "schoor steen",
            "prefLabel": "schoorsteen"
        }
    ]
}

const json_ld_error2 = {
    "@context": {
        "collections": {
            "@type": "@id",
            "@reverse": "member"
        },
        "id": "@id",
        "type" : {
            "@id" : "@type",
            "@type" : "@id"
        },
        "inscheme" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#inScheme",
            "@type" : "@id"
        },
        "prefLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#prefLabel",
            "@language" : "nl"
        },
        "altLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#altLabel",
            "@language" : "nl"
        },
        "member" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#member",
            "@type" : "@id"
        },
        "identifier": {
            "@id": "http://purl.org/dc/elements/1.1/identifier",
            "@type" : "@id"
        },
        "conceptscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/",
        "collectie": "https://data.omgeving.vlaanderen.be/id/collection/gebouw/",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "@base": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/"
    },
    "@graph": [
        {
            "id": "conceptscheme:gebouw",
            "type": "skos:ConceptScheme",
            "prefLabel": "Codelijst bouw",
            "identifier": "https://data.omgeving.vlaanderen.be/id/conceptscheme/gebouw",
        },
        {
            "id": "collectie:verwaarlozing",
            "type": "skos:Collection",
            "member": [
                "schoorsteen",
                "buitenmuur",
            ],
            "altLabel": "co_verwaarlozing",
            "prefLabel": "Collectie van concepten die gebruikt worden binnen de applicatie verwaarlozing en leegstand."
        },
        {
            "id": "buitenmuur",
            "type": "skos:Concept",
            "altLabel": "buiten muur",
            "prefLabel": "buitenmuur"
        },
        {
            "id": "schoorsteen",
            "type": "skos:Concept",
            "altLabel": "schoor steen",
            "prefLabel": "schoorsteen"
        }
    ]
}

const json_ld = {
    "@context": {
        "collections": {
            "@type": "@id",
            "@reverse": "member"
        },
        "id": "@id",
        "type" : {
            "@id" : "@type",
            "@type" : "@id"
        },
        "prefLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#prefLabel",
            "@language" : "nl"
        },
        "inscheme" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#inScheme",
            "@type" : "@id"
        },
        "altLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#altLabel",
            "@language" : "nl"
        },
        "member" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#member",
            "@type" : "@id"
        },
        "dc.identifier": {
            "@id": "http://purl.org/dc/elements/1.1/identifier"
        },
        "conceptscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/",
        "collectie": "https://data.omgeving.vlaanderen.be/id/collection/gebouw/",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "@base": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/"
},
    "@graph": [
        {
            "id": "conceptscheme:gebouw",
            "type": "skos:ConceptScheme",
            "prefLabel": "Codelijst bouw",
            "dc.identifier": "be.vlaanderen.omgeving.data.id.conceptscheme.gebouw",
        },
    {
        "id": "collectie:verwaarlozing",
        "type": "skos:Collection",
        "member": [
            "schoorsteen",
            "buitenmuur",
        ],
        "altLabel": "co_verwaarlozing",
        "prefLabel": "Collectie van concepten die gebruikt worden binnen de applicatie verwaarlozing en leegstand."
    },
    {
        "id": "buitenmuur",
        "type": "skos:Concept",
        "altLabel": "buiten muur",
        "prefLabel": "buitenmuur",
        "inscheme": "conceptscheme:gebouw"
    },
  {
        "id": "schoorsteen",
        "type": "skos:Concept",
        "altLabel": "schoor steen",
        "prefLabel": "schoorsteen",
        "inscheme": "conceptscheme:gebouw"
}
]
}

const json_ld_parquet = {
    "@context": {
        "collections": {
            "@type": "@id",
            "@reverse": "member"
        },
        "id": "@id",
        "type" : {
            "@id" : "@type",
            "@type" : "@id"
        },
        "prefLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#prefLabel",
            "@language" : "nl"
        },
        "inscheme" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#inScheme",
            "@type" : "@id",

        },
        "altLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#altLabel",
            "@language" : "nl"
        },
        "member" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#member",
            "@type" : "@id"
        },
        "identifier": {
            "@id": "http://purl.org/dc/elements/1.1/identifier"
        }        ,
        "nummer" : {
            "@id" : "http://example.com#nummer",
            "@type" : "http://www.w3.org/2001/XMLSchema#decimal"
        },
        "waar" : {
            "@id" : "http://example.com#waar",
            "@type" : "http://www.w3.org/2001/XMLSchema#boolean"
        },
        "nietwaar" : {
            "@id" : "http://example.com#nietwaar",
            "@type" : "http://www.w3.org/2001/XMLSchema#boolean"
        },
        "conceptscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/",
        "collectie": "https://data.omgeving.vlaanderen.be/id/collection/gebouw/",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "@base": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/"
    },
    "@graph": [
        {
            "id": "conceptscheme:gebouw",
            "type": [
                "http://www.w3.org/2004/02/skos/core#ConceptScheme"
            ],
            "prefLabel": "Codelijst bouw",
            "dc.identifier": "be.vlaanderen.omgeving.data.id.conceptscheme.gebouw",
            "nummer": "0.6",
            "waar": "true" ,
            "nietwaar": false
        },
        {
            "id": "collectie:verwaarlozing",
            "type": [
                "http://www.w3.org/2004/02/skos/core#Collection",
                "http://example.com#Klasse"
            ],
            "member": [
                "schoorsteen",
                "buitenmuur",
            ],
            "altLabel": "co_verwaarlozing",
            "prefLabel": "Collectie van concepten die gebruikt worden binnen de applicatie verwaarlozing en leegstand."
        },
        {
            "id": "buitenmuur",
            "type": [
                "http://www.w3.org/2004/02/skos/core#Concept"
            ],
            "nummer": 20 ,
            "altLabel": "buiten muur",
            "prefLabel": "buitenmuur",
            "inscheme": "conceptscheme:gebouw"
        },
        {
            "id": "schoorsteen",
            "type": [
                "http://www.w3.org/2004/02/skos/core#Concept"
            ],
            "altLabel": "schoor steen",
            "prefLabel": "schoorsteen",
            "inscheme": "conceptscheme:gebouw"
        }
    ]
}

export { json_ld, json_ld_error, json_ld_error2, succes_frame, fail_frame, json_ld_parquet, succes_frame_parquet, fail_frame_2 };