import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchedMeshComponent } from './batched-mesh.component';

describe('BatchedMeshComponent', () => {
  let component: BatchedMeshComponent;
  let fixture: ComponentFixture<BatchedMeshComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchedMeshComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BatchedMeshComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

