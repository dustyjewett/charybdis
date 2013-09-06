/**
 * These are the naming strategies for our temporary file names.
 * We keep them identifiable so we can know if a specific part of the app is leaking file references
 *
 * @type {{reportThumb: {prefix: string, suffix: string}, diffmaster: {prefix: string, suffix: string}, diffnew: {prefix: string, suffix: string}, diffdiff: {prefix: string, suffix: string}, reportRender: {prefix: string, suffix: string}, thumbString: {prefix: string, suffix: string}, compareA: {prefix: string, suffix: string}, compareB: {prefix: string, suffix: string}, compareC: {prefix: string, suffix: string}}}
 */
module.exports = {
    reportThumb:{
        prefix: 'charybdis-rt-',
        suffix: '.png'
    },
    diffmaster:{
        prefix: 'charybdis-dm-',
        suffix: '.png'
    },
    diffnew:{
        prefix: 'charybdis-dn-',
        suffix: '.png'
    },
    diffdiff:{
        prefix: 'charybdis-dd-',
        suffix: '.png'
    },
    reportRender:{
        prefix: 'charybdis-rr-',
        suffix: '.png'
    },
    thumbString:{
        prefix: 'charybdis-ts-',
        suffix: '.png'
    },
    compareA:{
        prefix: 'charybdis-ca-',
        suffix: '.png'
    },
    compareB:{
        prefix: 'charybdis-cb-',
        suffix: '.png'
    },
    compareC:{
        prefix: 'charybdis-cc-',
        suffix: '.png'
    }
};