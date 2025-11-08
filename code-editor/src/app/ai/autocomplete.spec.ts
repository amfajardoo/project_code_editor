import { TestBed } from '@angular/core/testing';

import { Autocomplete } from './autocomplete';

describe('Autocomplete', () => {
  let service: Autocomplete;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Autocomplete);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
