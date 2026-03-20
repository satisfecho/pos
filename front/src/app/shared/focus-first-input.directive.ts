import { AfterViewInit, Directive, ElementRef } from '@angular/core';

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * When the host element is rendered (e.g. a modal with a form), focus the first
 * focusable form control (input, select, textarea). Use on modal content containers
 * so that when the dialog opens, the user can type immediately.
 */
@Directive({
  selector: '[appFocusFirstInput]',
  standalone: true
})
export class FocusFirstInputDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.focusFirst(), 0);
  }

  private focusFirst(): void {
    const first = this.el.nativeElement.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(FOCUSABLE);
    if (first) {
      first.focus();
    }
  }
}
