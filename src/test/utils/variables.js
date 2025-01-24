

const context = {
    "collections": {
        "@type": "@id",
        "@reverse": "member"
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



const succes_frame = {
    "@context": context,
    "@type": ["http://www.w3.org/2004/02/skos/core#Collection", "http://www.w3.org/2004/02/skos/core#Concept"],
    "member": {
        "@type": "http://www.w3.org/2004/02/skos/core#Concept",
        "@embed": "@never",
        "@omitDefault": true
    }
}

const fail_frame = {
    "@context": context,
    "@type": ["http://www.w3.org/2004/02/skos/core#Collection", "http://www.w3.org/2004/02/skos/core#Concept"]
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
        "altLabel" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#altLabel",
            "@language" : "nl"
        },
        "member" : {
            "@id" : "http://www.w3.org/2004/02/skos/core#member",
            "@type" : "@id"
        },
        "collectie": "https://data.omgeving.vlaanderen.be/id/collection/gebouw/",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "@base": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/"
},
    "@graph": [
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
export { json_ld, succes_frame, fail_frame };