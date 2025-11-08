import { TestBed } from '@angular/core/testing';

import { CodeMirrorSetup } from './code-mirror-setup';

describe('Setup', () => {
  let service: CodeMirrorSetup;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodeMirrorSetup);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
