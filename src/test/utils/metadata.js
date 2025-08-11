import {describe, it} from 'node:test' ;
import assert from "node:assert";
import { to_be_metadated } from '../../utils/functions.js';


describe('to_be_metadated(historic_version, start_version)', () => {
    it('should not create metadata for historic version 1.2.9 if metadata.start_version = 1.10.9', async () => {
        const historic_version = '1.2.9'
        const start_version = '1.10.9'
        assert(!to_be_metadated(historic_version, start_version));
    });
    it('should create metadata for historic version 1.20.9 if metadata.start_version = 1.10.9', async () => {
        const historic_version = '1.20.7'
        const start_version = '1.10.9'
        assert(to_be_metadated(historic_version, start_version));
    });
});