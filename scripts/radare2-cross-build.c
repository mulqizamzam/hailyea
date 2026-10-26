#include <stdio.h>

#ifndef BUILD_AFTER
#define BUILD_AFTER 0
#endif

#if BUILD_AFTER
__attribute__((noinline, used))
int added_helper(int input) {
    volatile int value = input;
    return value * 5 + 23;
}
#endif

__attribute__((noinline, used))
int stable_helper(int input) {
#if BUILD_AFTER
    volatile int value = input;
    for (int i = 0; i < 8; ++i) {
        value = value * 3 + i;
    }
    return value;
#else
    return input + 17;
#endif
}

__attribute__((noinline, used))
int unchanged_helper(int input) {
    return (input ^ 0x35) + 9;
}

int main(int argc, char **argv) {
    (void)argv;
    int value = stable_helper(argc) + unchanged_helper(argc);
#if BUILD_AFTER
    value += added_helper(argc);
#endif
    printf("%d\n", value);
    return value == -12345;
}
