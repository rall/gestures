import { Observable, timer, fromEvent } from 'rxjs';
import { exhaustMap, takeUntil, pluck, pairwise, filter, map, mergeMap, reduce, share, throttleTime } from 'rxjs/operators';

export class Gesture {
    private swipeZone: number;
    readonly swipeTime = 500;
    
    private touchmove$:Observable<TouchEvent> = fromEvent<TouchEvent>(this.element, "touchmove").pipe(
        share(),
      );
  
    private touchstart$:Observable<TouchEvent> = fromEvent<TouchEvent>(this.element, "touchstart").pipe(
        share(),
    );

    private touchend$:Observable<TouchEvent> = fromEvent<TouchEvent>(this.element, "touchend").pipe(
        share(),
    );

    constructor(private element:HTMLElement) {
        this.swipeZone = 1000;
    }

    public dragY():Observable<number> {
        return this.touchstart$.pipe(
            exhaustMap(() => this.touchmove$
                .pipe(
                    takeUntil(this.touchend$),
                    pluck<TouchEvent, number>("touches", "0", "pageY"),
                    pairwise(),
                    filter(([previous, current]) => Boolean(current && previous)),
                    map(([previous, current]) => current - previous),
                )
            ),
        )
    }

    public swipeY(throttle?:number):Observable<number> {
        const swipe$ = this.touchstart$.pipe(
            takeUntil(this.touchend$),
            exhaustMap(() => this.touchmove$
                .pipe(
                    pluck<TouchEvent, number>("touches", "0", "pageY"),
                    mergeMap(startY => this.touchmove$.pipe(
                        takeUntil(timer(this.swipeTime)),
                        pluck<TouchEvent, number>("touches", "0", "pageY"),
                        reduce((_, value) => startY - value, 0),
                    )),
                    filter(dy => Math.abs(dy) > this.swipeZone),
                )
            ),
        )

        return throttle ? swipe$.pipe(throttleTime(throttle)) : swipe$;
    }
}